import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , sourceArg = "imports/images", outputArg = "imports/manifest.json", batchArg = "Shared album intake"] = process.argv;

const cwd = process.cwd();
const sourceDir = path.resolve(cwd, sourceArg);
const outputFile = path.resolve(cwd, outputArg);

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".heic"]);

function toPosixRelative(targetPath) {
  return path.relative(cwd, targetPath).split(path.sep).join("/");
}

function sortByName(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function stableIdFor(relativePath, fileSizeBytes) {
  return createHash("sha1").update(`${relativePath}:${fileSizeBytes}`).digest("hex").slice(0, 12);
}

const dirEntries = await readdir(sourceDir, { withFileTypes: true });
const imageFiles = dirEntries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => allowedExtensions.has(path.extname(name).toLowerCase()))
  .sort(sortByName);

const generatedAt = new Date().toISOString();
const items = [];

for (const filename of imageFiles) {
  const absolutePath = path.join(sourceDir, filename);
  const fileStat = await stat(absolutePath);
  const relativePath = toPosixRelative(absolutePath);
  const extension = path.extname(filename).toLowerCase();
  const basename = path.basename(filename, extension);
  const draftId = stableIdFor(relativePath, fileStat.size);

  items.push({
    draft_id: draftId,
    source_path: relativePath,
    filename,
    source_asset_key: basename,
    extension,
    file_size_bytes: fileStat.size,
    batch_name: batchArg,
    import_status: "pending_review",
    review_notes: "",
    item_name: "",
    category: "",
    color: "",
    material: "",
    dimensions: "",
    room: "",
    condition: "good",
    tags: [],
    notes: "",
    caption: "",
    group_key: "",
    current_location_name: "Warehouse",
    home_location_name: "Warehouse",
    source_job_name: "",
  });
}

const manifest = {
  version: 1,
  generated_at: generatedAt,
  source_dir: toPosixRelative(sourceDir),
  total_items: items.length,
  defaults: {
    batch_name: batchArg,
    current_location_name: "Warehouse",
    home_location_name: "Warehouse",
    condition: "good",
  },
  items,
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Generated ${items.length} manifest entries at ${toPosixRelative(outputFile)}`);
