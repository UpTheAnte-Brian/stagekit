import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(rawArgs) {
  const options = {
    source: null,
    outputDir: "audits",
    output: null,
    help: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--source") {
      const nextValue = rawArgs[index + 1];
      if (!nextValue) {
        throw new Error("--source requires a path.");
      }
      options.source = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--output-dir") {
      const nextValue = rawArgs[index + 1];
      if (!nextValue) {
        throw new Error("--output-dir requires a path.");
      }
      options.outputDir = nextValue;
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

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/build-inventory-audit-review-queue.mjs [--source audits/file.json] [--output-dir audits] [--output audits/file.json]

Builds the review queue consumed by apply-inventory-audit-tags.mjs.

Without --source, the script uses the newest inventory-media-audit-*.json file in the output directory.
`);
}

function timestampForFilename(date = new Date()) {
  return date.toISOString().replaceAll(":", "-");
}

async function findLatestAuditReport(cwd, outputDir) {
  const directory = path.resolve(cwd, outputDir);
  const entries = await readdir(directory, { withFileTypes: true });
  const candidateNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^inventory-media-audit-.*\.json$/.test(name))
    .sort((left, right) => right.localeCompare(left));

  if (candidateNames.length === 0) {
    throw new Error(`No inventory-media-audit-*.json files found in ${path.relative(cwd, directory) || "."}.`);
  }

  return path.join(directory, candidateNames[0]);
}

function isHighPriorityBadImage(candidate) {
  const flags = new Set(candidate.quality_flags ?? []);
  return (
    flags.has("tiny_file_size") ||
    flags.has("very_dark") ||
    flags.has("very_bright") ||
    flags.has("very_low_entropy") ||
    flags.has("mostly_black") ||
    flags.has("mostly_white") ||
    flags.has("missing_dimensions")
  );
}

function takeTop(items, count) {
  return items.slice(0, Math.min(items.length, count));
}

function renderMarkdownReport(queue) {
  const lines = [
    "# Inventory Review Queue",
    "",
    `Generated: ${queue.generated_at}`,
    "",
    `Source audit: ${queue.source_audit}`,
    "",
    "## Summary",
    "",
    `- Unreadable photos: ${queue.unreadable_photos.length}`,
    `- Exact duplicate photo groups: ${queue.exact_duplicate_photo_groups.length}`,
    `- High-confidence duplicate items: ${queue.likely_duplicate_items_high_confidence.length}`,
    `- High-priority bad-image candidates: ${queue.bad_image_candidates_high_priority.length}`,
    "",
  ];

  if (queue.unreadable_photos.length > 0) {
    lines.push("## Unreadable Photos", "");
    for (const photo of takeTop(queue.unreadable_photos, 25)) {
      lines.push(`- ${photo.item_code ?? photo.item_id} · ${photo.item_name} · ${photo.storage_path} · ${photo.error}`);
    }
    lines.push("");
  }

  if (queue.likely_duplicate_items_high_confidence.length > 0) {
    lines.push("## High-Confidence Duplicate Items", "");
    for (const candidate of takeTop(queue.likely_duplicate_items_high_confidence, 40)) {
      lines.push(
        `- ${candidate.left.item_code ?? candidate.left.item_id} / ${candidate.right.item_code ?? candidate.right.item_id} · ${candidate.left.item_name} · ${candidate.reason}`,
      );
    }
    lines.push("");
  }

  if (queue.bad_image_candidates_high_priority.length > 0) {
    lines.push("## High-Priority Bad Images", "");
    for (const candidate of takeTop(queue.bad_image_candidates_high_priority, 50)) {
      lines.push(
        `- ${candidate.item_code ?? candidate.item_id} · ${candidate.item_name} · ${candidate.photo_id} · ${(candidate.quality_flags ?? []).join(", ")}`,
      );
    }
    lines.push("");
  }

  if (queue.exact_duplicate_photo_groups.length > 0) {
    lines.push("## Exact Duplicate Photo Groups", "");
    for (const group of takeTop(queue.exact_duplicate_photo_groups, 50)) {
      const labels = (group.photos ?? []).map((photo) => photo.item_code ?? photo.item_id).join(", ");
      lines.push(`- ${labels} · hash ${group.exact_sha1}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const cwd = process.cwd();
const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const sourcePath = options.source
  ? path.resolve(cwd, options.source)
  : await findLatestAuditReport(cwd, options.outputDir);
const audit = JSON.parse(await readFile(sourcePath, "utf8"));

const generatedAt = new Date().toISOString();
const timestamp = timestampForFilename(new Date(generatedAt));
const outputPath = path.resolve(
  cwd,
  options.output ?? path.join(options.outputDir, `inventory-media-review-queue-${timestamp}.json`),
);
const markdownPath = outputPath.replace(/\.json$/i, ".md");

const queue = {
  generated_at: generatedAt,
  source_audit: path.relative(cwd, sourcePath),
  unreadable_photos: audit.unreadable_photos ?? [],
  exact_duplicate_photo_groups: audit.exact_duplicate_photo_groups ?? [],
  likely_duplicate_items_high_confidence: (audit.likely_duplicate_items ?? []).filter((candidate) => candidate.shared_exact_cover_hash),
  bad_image_candidates_high_priority: (audit.bad_image_candidates ?? []).filter(isHighPriorityBadImage),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(queue, null, 2)}\n`);
await writeFile(markdownPath, renderMarkdownReport(queue));

console.log(
  JSON.stringify(
    {
      queue_report: path.relative(cwd, outputPath),
      markdown_report: path.relative(cwd, markdownPath),
      source_audit: queue.source_audit,
      unreadable_photos: queue.unreadable_photos.length,
      exact_duplicate_photo_groups: queue.exact_duplicate_photo_groups.length,
      likely_duplicate_items_high_confidence: queue.likely_duplicate_items_high_confidence.length,
      bad_image_candidates_high_priority: queue.bad_image_candidates_high_priority.length,
    },
    null,
    2,
  ),
);
