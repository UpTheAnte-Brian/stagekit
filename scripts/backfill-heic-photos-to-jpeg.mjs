import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const execFileAsync = promisify(execFile);

const [, , manifestArg = "imports/manifest.json", ...rawFlags] = process.argv;
const dryRun = rawFlags.includes("--dry-run");
const cwd = process.cwd();
const manifestPath = path.resolve(cwd, manifestArg);

function parseDotEnv(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return values;
}

async function loadEnv() {
  const envFile = path.resolve(cwd, ".env.local");
  const envContents = await readFile(envFile, "utf8");
  return parseDotEnv(envContents);
}

async function saveManifest(manifest) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function convertHeicToJpeg(sourcePath) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "stagekit-backfill-"));
  const outputPath = path.join(tempDir, `${path.parse(sourcePath).name}.jpg`);

  try {
    await execFileAsync("/usr/bin/sips", ["-s", "format", "jpeg", sourcePath, "--out", outputPath]);
    return await readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

const env = await loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const candidates = manifest.items.filter((item) => {
  const sourceExtension = path.extname(item.source_path ?? "").toLowerCase();
  const importedPath = item.imported_storage_path ?? "";
  return item.import_status === "imported" && sourceExtension === ".heic" && importedPath.toLowerCase().endsWith(".heic");
});

let updated = 0;

for (let index = 0; index < manifest.items.length; index += 1) {
  const item = manifest.items[index];
  const sourceExtension = path.extname(item.source_path ?? "").toLowerCase();
  const oldStoragePath = item.imported_storage_path ?? "";

  if (!(item.import_status === "imported" && sourceExtension === ".heic" && oldStoragePath.toLowerCase().endsWith(".heic"))) {
    continue;
  }

  const itemId = item.imported_item_id;
  if (!itemId) {
    throw new Error(`Missing imported_item_id for ${item.source_path}`);
  }

  const absoluteImagePath = path.resolve(cwd, item.source_path);
  const jpegBuffer = await convertHeicToJpeg(absoluteImagePath);
  const parsedStoragePath = path.parse(oldStoragePath);
  const newStoragePath = path.posix.join(parsedStoragePath.dir, `${parsedStoragePath.name}.jpg`);

  if (dryRun) {
    updated += 1;
    continue;
  }

  const { error: uploadError } = await supabase.storage.from("inventory").upload(newStoragePath, jpegBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`Failed to upload JPEG for ${item.source_path}: ${uploadError.message}`);
  }

  const { error: photoUpdateError } = await supabase
    .from("inventory_photos")
    .update({ storage_path: newStoragePath })
    .eq("item_id", itemId)
    .eq("storage_bucket", "inventory")
    .eq("storage_path", oldStoragePath);
  if (photoUpdateError) {
    throw new Error(`Failed to update photo row for ${item.source_path}: ${photoUpdateError.message}`);
  }

  const { error: deleteError } = await supabase.storage.from("inventory").remove([oldStoragePath]);
  if (deleteError) {
    throw new Error(`Failed to remove old HEIC for ${item.source_path}: ${deleteError.message}`);
  }

  manifest.items[index] = {
    ...item,
    imported_storage_path: newStoragePath,
  };
  await saveManifest(manifest);
  updated += 1;
}

console.log(
  JSON.stringify(
    {
      manifest: path.relative(cwd, manifestPath),
      dry_run: dryRun,
      candidates: candidates.length,
      updated,
    },
    null,
    2,
  ),
);
