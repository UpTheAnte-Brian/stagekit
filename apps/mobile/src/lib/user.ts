import type { Session } from "@supabase/supabase-js";

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getMetadata(session: Session | null) {
  return session?.user.user_metadata ?? {};
}

export function getDisplayUsername(session: Session | null) {
  const metadata = getMetadata(session);
  const fullName =
    normalizeName(metadata.full_name) ||
    normalizeName(metadata.name) ||
    normalizeName(metadata.preferred_username) ||
    normalizeName(metadata.user_name) ||
    normalizeName(metadata.username);

  if (fullName) {
    return fullName;
  }

  const email = session?.user.email?.trim();
  if (email) {
    return email.split("@")[0] || "Unknown user";
  }

  return "Unknown user";
}

export function getPreferredLocationId(session: Session | null) {
  return normalizeName(getMetadata(session).preferred_location_id) || null;
}

export function getPreferredLocationName(session: Session | null) {
  return normalizeName(getMetadata(session).preferred_location_name) || null;
}

export function getQuickSelectIncludeTimestamp(session: Session | null) {
  const value = getMetadata(session).quick_select_include_timestamp;
  return typeof value === "boolean" ? value : true;
}

export function buildBulkPackRequestLabel(session: Session | null, date = new Date()) {
  const username = getDisplayUsername(session);
  return getQuickSelectIncludeTimestamp(session)
    ? `Bulk pack request by ${username} at ${date.toLocaleString()}`
    : `Bulk pack request by ${username}`;
}
