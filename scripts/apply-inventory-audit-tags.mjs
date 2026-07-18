import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

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

async function loadEnv(cwd) {
  const envFile = path.resolve(cwd, ".env.local");
  const envContents = await readFile(envFile, "utf8");
  return parseDotEnv(envContents);
}

function parseArgs(rawArgs) {
  const options = {
    apply: false,
    queue: null,
    output: null,
    sync: false,
    help: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--queue") {
      const nextValue = rawArgs[index + 1];
      if (!nextValue) {
        throw new Error("--queue requires a path.");
      }
      options.queue = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--output") {
      const nextValue = rawArgs[index + 1];
      if (!nextValue) {
        throw new Error("--output requires a path.");
      }
      options.output = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--sync") {
      options.sync = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/apply-inventory-audit-tags.mjs [--apply] [--sync] [--queue audits/review.json] [--output audits/file.json]

Applies non-destructive audit tags to inventory items from a review queue.

Tags:
  audit-duplicate-candidate
  audit-bad-image
  audit-unreadable-photo

Without --apply, the script runs as a dry run and only writes a report.
With --sync, the script removes stale audit tags that are not present in the current queue before reapplying the current queue.
`);
}

function addReason(map, item, tag, reason) {
  const entry = map.get(item.item_id) ?? {
    item_id: item.item_id,
    item_code: item.item_code ?? null,
    item_name: item.item_name,
    tags_to_add: new Set(),
    reasons: [],
  };

  entry.tags_to_add.add(tag);
  entry.reasons.push(reason);
  map.set(item.item_id, entry);
}

const suppressionTagByAuditTag = {
  "audit-unreadable-photo": "audit-ignore-unreadable-photo",
  "audit-bad-image": "audit-ignore-bad-image",
  "audit-duplicate-candidate": "audit-ignore-duplicate-candidate",
};
const auditTagValues = Object.keys(suppressionTagByAuditTag);

function timestampForFilename(date = new Date()) {
  return date.toISOString().replaceAll(":", "-");
}

async function findLatestQueueFile(cwd) {
  const queueDirectory = path.resolve(cwd, "audits");
  const entries = await readdir(queueDirectory, { withFileTypes: true });
  const candidateNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^inventory-media-review-queue-.*\.json$/.test(name))
    .sort((left, right) => right.localeCompare(left));

  if (candidateNames.length === 0) {
    throw new Error("No inventory-media-review-queue-*.json files found in audits.");
  }

  return path.join(queueDirectory, candidateNames[0]);
}

function uniqueSortedTags(tags) {
  return [...new Set(tags)].sort((left, right) => left.localeCompare(right));
}

const cwd = process.cwd();
const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const queuePath = options.queue ? path.resolve(cwd, options.queue) : await findLatestQueueFile(cwd);
const queue = JSON.parse(await readFile(queuePath, "utf8"));

const itemsById = new Map();

for (const row of queue.unreadable_photos ?? []) {
  addReason(itemsById, row, "audit-unreadable-photo", `Unreadable photo ${row.photo_id}`);
}

for (const row of queue.bad_image_candidates_high_priority ?? []) {
  addReason(itemsById, row, "audit-bad-image", `Bad image ${row.photo_id}: ${row.quality_flags.join(", ")}`);
}

for (const row of queue.likely_duplicate_items_high_confidence ?? []) {
  addReason(
    itemsById,
    {
      item_id: row.left.item_id,
      item_code: row.left.item_code,
      item_name: row.left.item_name,
    },
    "audit-duplicate-candidate",
    `High-confidence duplicate with ${row.right.item_code ?? row.right.item_id}`,
  );
  addReason(
    itemsById,
    {
      item_id: row.right.item_id,
      item_code: row.right.item_code,
      item_name: row.right.item_name,
    },
    "audit-duplicate-candidate",
    `High-confidence duplicate with ${row.left.item_code ?? row.left.item_id}`,
  );
}

const targetedItems = [...itemsById.values()];

const env = await loadEnv(cwd);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const targetedById = new Map(targetedItems.map((item) => [item.item_id, item]));
const existingRowsById = new Map();

if (targetedById.size > 0) {
  const itemIds = [...targetedById.keys()];
  for (let from = 0; from < itemIds.length; from += 100) {
    const batch = itemIds.slice(from, from + 100);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id,item_code,name,tags")
      .in("id", batch);

    if (error) {
      throw new Error(`Failed to load inventory items: ${error.message}`);
    }

    for (const row of data ?? []) {
      existingRowsById.set(row.id, row);
    }
  }
}

if (options.sync) {
  for (let from = 0; ; from += 1000) {
    const to = from + 999;
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id,item_code,name,tags")
      .overlaps("tags", auditTagValues)
      .range(from, to);

    if (error) {
      throw new Error(`Failed to load current audit-tagged inventory items: ${error.message}`);
    }

    const batch = data ?? [];
    for (const row of batch) {
      existingRowsById.set(row.id, row);
    }

    if (batch.length < 1000) {
      break;
    }
  }
}

const updates = [];

for (const existing of existingRowsById.values()) {
  const candidate = targetedById.get(existing.id);
  const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
  const allowedAuditTags = candidate
    ? [...candidate.tags_to_add].filter((tag) => {
        const suppressionTag = suppressionTagByAuditTag[tag];
        return suppressionTag ? !existingTags.includes(suppressionTag) : true;
      })
    : [];
  const baseTags = options.sync ? existingTags.filter((tag) => !auditTagValues.includes(tag)) : existingTags;
  const nextTags = uniqueSortedTags([...baseTags, ...allowedAuditTags]);

  if (nextTags.length === existingTags.length && nextTags.every((tag, index) => tag === existingTags[index])) {
    continue;
  }

  updates.push({
    item_id: existing.id,
    item_code: existing.item_code ?? candidate?.item_code ?? null,
    item_name: existing.name ?? candidate?.item_name ?? null,
    previous_tags: existingTags,
    next_tags: nextTags,
    reasons: candidate?.reasons ?? [],
  });
}

let appliedUpdates = 0;

if (options.apply) {
  for (const update of updates) {
    const { error } = await supabase.from("inventory_items").update({ tags: update.next_tags }).eq("id", update.item_id);
    if (error) {
      throw new Error(`Failed to update ${update.item_id}: ${error.message}`);
    }
    appliedUpdates += 1;
  }
}

const reportPath = path.resolve(
  cwd,
  options.output ?? `audits/inventory-audit-tags-${timestampForFilename()}.json`,
);

const report = {
  generated_at: new Date().toISOString(),
  dry_run: !options.apply,
  sync: options.sync,
  source_queue: path.relative(cwd, queuePath),
  targeted_item_count: targetedItems.length,
  updated_item_count: updates.length,
  applied_updates: appliedUpdates,
  tag_totals: {
    unreadable_photo: targetedItems.filter((item) => item.tags_to_add.has("audit-unreadable-photo")).length,
    bad_image: targetedItems.filter((item) => item.tags_to_add.has("audit-bad-image")).length,
    duplicate_candidate: targetedItems.filter((item) => item.tags_to_add.has("audit-duplicate-candidate")).length,
  },
  updates,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      report: path.relative(cwd, reportPath),
      dry_run: !options.apply,
      targeted_item_count: targetedItems.length,
      updated_item_count: updates.length,
      applied_updates: appliedUpdates,
      tag_totals: report.tag_totals,
    },
    null,
    2,
  ),
);
