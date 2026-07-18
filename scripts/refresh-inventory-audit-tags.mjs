import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function parseArgs(rawArgs) {
  const options = {
    limitPhotos: null,
    concurrency: null,
    outputDir: "audits",
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--limit-photos") {
      const nextValue = rawArgs[index + 1];
      if (!nextValue || !/^\d+$/.test(nextValue)) {
        throw new Error("--limit-photos requires a positive integer.");
      }
      options.limitPhotos = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--concurrency") {
      const nextValue = rawArgs[index + 1];
      if (!nextValue || !/^\d+$/.test(nextValue)) {
        throw new Error("--concurrency requires a positive integer.");
      }
      options.concurrency = nextValue;
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

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/refresh-inventory-audit-tags.mjs [--dry-run] [--limit-photos N] [--concurrency N] [--output-dir audits]

Runs the full inventory audit refresh:
  1. audit inventory media
  2. build the review queue from the newest audit output
  3. sync audit tags on inventory items to the queue

Use --dry-run to skip writing tag changes to Supabase.
`);
}

async function runJsonScript(scriptPath, args) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (stderr.trim().length > 0) {
    process.stderr.write(stderr);
  }

  return JSON.parse(stdout);
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const auditArgs = ["--output-dir", options.outputDir];
if (options.limitPhotos) {
  auditArgs.push("--limit-photos", options.limitPhotos);
}
if (options.concurrency) {
  auditArgs.push("--concurrency", options.concurrency);
}

const auditResult = await runJsonScript("scripts/audit-inventory-media.mjs", auditArgs);
const queueResult = await runJsonScript("scripts/build-inventory-audit-review-queue.mjs", [
  "--source",
  auditResult.json_report,
  "--output-dir",
  options.outputDir,
]);
const applyArgs = ["--queue", queueResult.queue_report, "--sync"];
if (!options.dryRun) {
  applyArgs.unshift("--apply");
}
const applyResult = await runJsonScript("scripts/apply-inventory-audit-tags.mjs", applyArgs);

console.log(
  JSON.stringify(
    {
      dry_run: options.dryRun,
      audit: auditResult,
      queue: queueResult,
      apply: applyResult,
    },
    null,
    2,
  ),
);
