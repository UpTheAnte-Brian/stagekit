import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

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

function addressLabel(job) {
  return [job.address1, job.address2, job.city, job.state, job.postal, "US"].filter(Boolean).join(", ");
}

async function geocode(address, apiKey) {
  const query = new URLSearchParams({ address, key: apiKey });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${query}`);
  if (!response.ok) throw new Error(`Google Maps returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload.status === "ZERO_RESULTS") return null;
  if (payload.status !== "OK") throw new Error(payload.error_message || `Google Maps returned ${payload.status}.`);
  const result = payload.results?.[0];
  const location = result?.geometry?.location;
  return typeof location?.lat === "number" && typeof location?.lng === "number"
    ? { address_label: result.formatted_address || address, latitude: location.lat, longitude: location.lng }
    : null;
}

const apply = process.argv.includes("--apply");
const env = parseDotEnv(await readFile(path.resolve(process.cwd(), ".env.local"), "utf8"));
const apiKey = env.GOOGLE_MAPS_SERVER_API_KEY || env.GOOGLE_MAPS_API_KEY;

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !apiKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GOOGLE_MAPS_SERVER_API_KEY in .env.local.");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: jobs, error } = await supabase
  .from("jobs")
  .select("id,name,address1,address2,city,state,postal")
  .is("latitude", null)
  .not("address1", "is", null)
  .not("city", "is", null)
  .not("state", "is", null)
  .order("created_at", { ascending: true });

if (error) throw new Error(error.message);

let found = 0;
for (const job of jobs ?? []) {
  const label = addressLabel(job);
  const match = await geocode(label, apiKey);
  if (!match) {
    console.log(`No result: ${job.name} — ${label}`);
    continue;
  }
  found += 1;
  console.log(`${apply ? "Stored" : "Would store"}: ${job.name} — ${match.latitude.toFixed(5)}, ${match.longitude.toFixed(5)}`);
  if (apply) {
    const { error: updateError } = await supabase
      .from("jobs")
      .update({ ...match, geocoded_at: new Date().toISOString() })
      .eq("id", job.id);
    if (updateError) throw new Error(`Could not update ${job.name}: ${updateError.message}`);
  }
}

console.log(`${apply ? "Stored" : "Found"} coordinates for ${found} project${found === 1 ? "" : "s"}.`);
