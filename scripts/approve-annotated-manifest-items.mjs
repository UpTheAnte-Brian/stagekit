import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , manifestArg = "imports/manifest.json"] = process.argv;

const cwd = process.cwd();
const manifestPath = path.resolve(cwd, manifestArg);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

let approved = 0;

manifest.items = manifest.items.map((item) => {
  if (item.import_status === "pending_review" && item.item_name?.trim()) {
    approved += 1;
    return {
      ...item,
      import_status: "approved",
    };
  }

  return item;
});

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Approved ${approved} manifest entries in ${path.relative(cwd, manifestPath)}`);
