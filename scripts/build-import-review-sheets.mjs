import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const [, , sourceArg = "imports/images", outputArg = "imports/review", batchSizeArg = "20"] = process.argv;

const cwd = process.cwd();
const sourceDir = path.resolve(cwd, sourceArg);
const outputDir = path.resolve(cwd, outputArg);
const batchSize = Number.parseInt(batchSizeArg, 10);
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".heic"]);

function sortByName(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function toPosixRelative(targetPath) {
  return path.relative(cwd, targetPath).split(path.sep).join("/");
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

const entries = (await readdir(sourceDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => allowedExtensions.has(path.extname(name).toLowerCase()))
  .sort(sortByName);

await mkdir(outputDir, { recursive: true });

const index = [];

for (let i = 0; i < entries.length; i += batchSize) {
  const batch = entries.slice(i, i + batchSize);
  const batchNumber = String(Math.floor(i / batchSize) + 1).padStart(3, "0");
  const sheetPath = path.join(outputDir, `sheet-${batchNumber}.jpg`);
  const args = [];

  for (const filename of batch) {
    const absolutePath = path.join(sourceDir, filename);
    args.push(absolutePath);
    args.push("-auto-orient");
    args.push("-thumbnail");
    args.push("360x360");
  }

  args.push("-background", "#202020");
  args.push("-geometry", "360x360+10+10");
  args.push("-tile", "4x5");
  args.push(sheetPath);

  await runCommand("montage", args);

  index.push({
    batch_number: batchNumber,
    sheet_path: toPosixRelative(sheetPath),
    files: batch.map((filename) => ({
      filename,
      source_path: toPosixRelative(path.join(sourceDir, filename)),
    })),
  });
}

await writeFile(path.join(outputDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

console.log(`Built ${index.length} review sheets in ${toPosixRelative(outputDir)}`);
