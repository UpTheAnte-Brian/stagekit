import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , manifestArg = "imports/manifest.json", annotationsArg] = process.argv;

if (!annotationsArg) {
  throw new Error("Usage: node scripts/apply-manifest-annotations.mjs <manifest> <annotations>");
}

const cwd = process.cwd();
const manifestPath = path.resolve(cwd, manifestArg);
const annotationsPath = path.resolve(cwd, annotationsArg);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const annotations = JSON.parse(await readFile(annotationsPath, "utf8"));
const annotationMap = new Map(annotations.map((entry) => [entry.source_path, entry]));

manifest.items = manifest.items.map((item) => {
  const next = annotationMap.get(item.source_path);
  return next ? { ...item, ...next } : item;
});

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Applied ${annotations.length} annotations to ${path.relative(cwd, manifestPath)}`);
