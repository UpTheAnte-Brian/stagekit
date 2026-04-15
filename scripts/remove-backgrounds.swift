import AppKit
import CoreML
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

enum OutputStyle: String {
    case transparent
    case black
}

struct Config {
    var inputPaths: [String] = []
    var outputDir: String = "imports/images-cutout"
    var style: OutputStyle = .transparent
    var overwrite = false
}

enum CLIError: Error, CustomStringConvertible {
    case message(String)

    var description: String {
        switch self {
        case .message(let text):
            return text
        }
    }
}

let supportedExtensions = Set(["png", "jpg", "jpeg", "heic", "heif", "webp", "avif"])

func printUsage() {
    let usage = """
    Usage:
      swift scripts/remove-backgrounds.swift [options] <file-or-directory> ...

    Options:
      --output-dir <path>   Output directory. Default: imports/images-cutout
      --style <mode>        transparent | black. Default: transparent
      --overwrite           Replace existing output files
      --help                Show this help

    Examples:
      swift scripts/remove-backgrounds.swift imports/images
      swift scripts/remove-backgrounds.swift --style black --output-dir imports/images-black imports/images
    """
    print(usage)
}

func parseArgs() throws -> Config {
    var config = Config()
    var index = 1
    let args = CommandLine.arguments

    while index < args.count {
        let arg = args[index]
        switch arg {
        case "--output-dir":
            index += 1
            guard index < args.count else {
                throw CLIError.message("Missing value for --output-dir")
            }
            config.outputDir = args[index]
        case "--style":
            index += 1
            guard index < args.count, let style = OutputStyle(rawValue: args[index]) else {
                throw CLIError.message("Expected --style transparent|black")
            }
            config.style = style
        case "--overwrite":
            config.overwrite = true
        case "--help", "-h":
            printUsage()
            exit(0)
        default:
            config.inputPaths.append(arg)
        }
        index += 1
    }

    guard !config.inputPaths.isEmpty else {
        throw CLIError.message("No input files or directories provided")
    }

    return config
}

func expandedURL(from path: String) -> URL {
    URL(fileURLWithPath: (path as NSString).expandingTildeInPath)
}

func collectImageURLs(from inputPaths: [String]) -> [URL] {
    let fm = FileManager.default
    var urls: [URL] = []

    for inputPath in inputPaths {
        let url = expandedURL(from: inputPath)
        var isDirectory: ObjCBool = false
        guard fm.fileExists(atPath: url.path, isDirectory: &isDirectory) else {
            fputs("Skipping missing path: \(url.path)\n", stderr)
            continue
        }

        if isDirectory.boolValue {
            let enumerator = fm.enumerator(
                at: url,
                includingPropertiesForKeys: [.isRegularFileKey],
                options: [.skipsHiddenFiles]
            )

            while let fileURL = enumerator?.nextObject() as? URL {
                let ext = fileURL.pathExtension.lowercased()
                if supportedExtensions.contains(ext) {
                    urls.append(fileURL)
                }
            }
        } else if supportedExtensions.contains(url.pathExtension.lowercased()) {
            urls.append(url)
        }
    }

    return urls.sorted { $0.path < $1.path }
}

func outputURL(for inputURL: URL, outputRoot: URL) -> URL {
    let baseName = inputURL.deletingPathExtension().lastPathComponent
    return outputRoot.appendingPathComponent("\(baseName).png")
}

func cgImagePropertyOrientation(for image: NSImage) -> CGImagePropertyOrientation {
    guard
        let tiff = image.tiffRepresentation,
        let source = CGImageSourceCreateWithData(tiff as CFData, nil),
        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
        let rawValue = properties[kCGImagePropertyOrientation] as? UInt32,
        let orientation = CGImagePropertyOrientation(rawValue: rawValue)
    else {
        return .up
    }

    return orientation
}

func writePNG(_ image: CGImage, to url: URL) throws {
    guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        throw CLIError.message("Failed to create image destination for \(url.path)")
    }

    CGImageDestinationAddImage(destination, image, nil)
    if !CGImageDestinationFinalize(destination) {
        throw CLIError.message("Failed to write output image \(url.path)")
    }
}

@available(macOS 15.0, *)
func processImage(inputURL: URL, outputURL: URL, style: OutputStyle, overwrite: Bool, ciContext: CIContext) async throws {
    if !overwrite, FileManager.default.fileExists(atPath: outputURL.path) {
        print("Skipping existing: \(outputURL.lastPathComponent)")
        return
    }

    guard let sourceImage = NSImage(contentsOf: inputURL) else {
        throw CLIError.message("Unable to read image \(inputURL.path)")
    }
    guard let cgImage = sourceImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        throw CLIError.message("Unable to decode CGImage for \(inputURL.path)")
    }

    let orientation = cgImagePropertyOrientation(for: sourceImage)
    let handler = ImageRequestHandler(cgImage, orientation: orientation)
    var request = GenerateForegroundInstanceMaskRequest()
    if let cpuDevice = MLComputeDevice.allComputeDevices.first(where: {
        if case .cpu = $0 { return true }
        return false
    }) {
        request.setComputeDevice(cpuDevice, for: .main)
        request.setComputeDevice(cpuDevice, for: .postProcessing)
    }

    guard let observation = try await handler.perform(request), !observation.allInstances.isEmpty else {
        throw CLIError.message("No foreground subject detected in \(inputURL.lastPathComponent)")
    }

    let maskBuffer = try observation.generateScaledMask(for: observation.allInstances, scaledToImageFrom: handler)
    let maskImage = CIImage(cvPixelBuffer: maskBuffer)
    let foreground = CIImage(cgImage: cgImage)

    let backgroundColor: CIColor = style == .transparent
        ? .clear
        : .black

    let background = CIImage(color: backgroundColor).cropped(to: foreground.extent)

    guard let filter = CIFilter(name: "CIBlendWithMask") else {
        throw CLIError.message("Unable to create CIBlendWithMask filter")
    }

    filter.setValue(background, forKey: kCIInputBackgroundImageKey)
    filter.setValue(foreground, forKey: kCIInputImageKey)
    filter.setValue(maskImage, forKey: kCIInputMaskImageKey)

    guard let outputImage = filter.outputImage else {
        throw CLIError.message("Failed to render blended output for \(inputURL.lastPathComponent)")
    }

    guard let rendered = ciContext.createCGImage(outputImage, from: foreground.extent) else {
        throw CLIError.message("Failed to create CGImage output for \(inputURL.lastPathComponent)")
    }

    try writePNG(rendered, to: outputURL)
    print("Wrote: \(outputURL.path)")
}

func run() async -> Int32 {
    do {
        guard #available(macOS 15.0, *) else {
            throw CLIError.message("This script requires macOS 15 or newer")
        }

        let config = try parseArgs()
        let outputRoot = expandedURL(from: config.outputDir)
        let imageURLs = collectImageURLs(from: config.inputPaths)

        guard !imageURLs.isEmpty else {
            throw CLIError.message("No supported image files found")
        }

        try FileManager.default.createDirectory(at: outputRoot, withIntermediateDirectories: true)

        let ciContext = CIContext(options: [.cacheIntermediates: false])
        var failures = 0

        for inputURL in imageURLs {
            do {
                let destinationURL = outputURL(for: inputURL, outputRoot: outputRoot)
                try await processImage(
                    inputURL: inputURL,
                    outputURL: destinationURL,
                    style: config.style,
                    overwrite: config.overwrite,
                    ciContext: ciContext
                )
            } catch {
                failures += 1
                fputs("Failed: \(inputURL.lastPathComponent): \(error)\n", stderr)
            }
        }

        print("Processed \(imageURLs.count) image(s), failures: \(failures)")
        return failures > 0 ? 1 : 0
    } catch {
        fputs("\(error)\n\n", stderr)
        printUsage()
        return 1
    }
}

let semaphore = DispatchSemaphore(value: 0)
var exitCode: Int32 = 0

Task {
    exitCode = await run()
    semaphore.signal()
}

semaphore.wait()
exit(exitCode)
