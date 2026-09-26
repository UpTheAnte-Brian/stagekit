import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const SOURCE_PATH = path.resolve(process.cwd(), "imports/projects/quicken-historical-project-candidates.json");

function parseDotEnv(contents) {
  return Object.fromEntries(
    contents.split(/\r?\n/).flatMap((rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) return [];
      const separator = line.indexOf("=");
      if (separator === -1) return [];
      return [[line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]];
    }),
  );
}

function clean(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeAddressPart(value) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bstreet\b/g, "st")
    .replace(/\broad\b/g, "rd")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\bcourt\b/g, "ct")
    .replace(/\btrail\b/g, "tr")
    .replace(/\blane\b/g, "ln")
    .replace(/\bplace\b/g, "pl")
    .replace(/\bnorth\b/g, "n")
    .replace(/\bsouth\b/g, "s")
    .replace(/\beast\b/g, "e")
    .replace(/\bwest\b/g, "w")
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function addressKey(record) {
  return [record.address1, record.city, record.state].map(normalizeAddressPart).join("|");
}

function isComplete(record) {
  return Boolean(clean(record.project_name) && clean(record.address1) && clean(record.city) && clean(record.state));
}

function toJob(record, defaults) {
  const address1 = clean(record.address1);
  const city = clean(record.city);
  const state = clean(record.state);
  const postal = clean(record.postal);
  const addressLabel = [address1, city, state, postal].filter(Boolean).join(", ");
  const provenance = `Source candidate: ${record.candidate_key}.`;

  return {
    name: clean(record.project_name),
    address1,
    address2: clean(record.address2),
    address_label: addressLabel,
    city,
    state,
    postal,
    status: defaults.status ?? "completed",
    notes: `${defaults.notes ?? "Historical project import."} ${provenance}`,
  };
}

const validateOnly = process.argv.includes("--validate-only");
const apply = process.argv.includes("--apply");
const source = JSON.parse(await readFile(SOURCE_PATH, "utf8"));
const records = Array.isArray(source.records) ? source.records : [];
const complete = records.filter(isComplete);
const incomplete = records.filter((record) => !isComplete(record));
const seen = new Map();
const duplicates = [];

for (const record of complete) {
  const key = addressKey(record);
  if (seen.has(key)) duplicates.push([seen.get(key), record.candidate_key]);
  else seen.set(key, record.candidate_key);
}

console.log(`Reviewed records: ${records.length}`);
console.log(`Ready for import: ${complete.length}`);
console.log(`Held for more address cleanup: ${incomplete.length}`);
for (const record of incomplete) {
  console.log(`  HOLD ${record.candidate_key}: ${record.review_status}`);
}

if (duplicates.length > 0) {
  for (const [first, second] of duplicates) console.error(`Duplicate address in source: ${first} and ${second}`);
  process.exitCode = 1;
} else {
  console.log("Duplicate addresses inside source: 0");
}

if (validateOnly || process.exitCode) process.exit();

const env = parseDotEnv(await readFile(path.resolve(process.cwd(), ".env.local"), "utf8"));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: existingJobs, error: existingError } = await supabase
  .from("jobs")
  .select("id,name,address1,city,state")
  .order("created_at", { ascending: true });

if (existingError) throw new Error(`Could not check existing projects: ${existingError.message}`);

const existingByAddress = new Map((existingJobs ?? []).map((job) => [addressKey(job), job]));
let inserted = 0;
let skipped = 0;

for (const record of complete) {
  const existing = existingByAddress.get(addressKey(record));
  if (existing) {
    skipped += 1;
    console.log(`SKIP existing: ${record.project_name} matches ${existing.name}`);
    continue;
  }

  const job = toJob(record, source.import_defaults ?? {});
  if (!apply) {
    console.log(`WOULD INSERT: ${job.name} — ${job.address_label}`);
    inserted += 1;
    continue;
  }

  const { data, error } = await supabase.from("jobs").insert(job).select("id,name").single();
  if (error) throw new Error(`Could not import ${record.project_name}: ${error.message}`);
  inserted += 1;
  existingByAddress.set(addressKey(record), data);
  console.log(`INSERTED: ${data.name} (${data.id})`);
}

console.log(`${apply ? "Imported" : "Would import"}: ${inserted}; skipped existing: ${skipped}; held: ${incomplete.length}.`);
