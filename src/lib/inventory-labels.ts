import { isInventoryAuditSuppressionTag, isInventoryAuditTag } from "@/lib/inventory-audit";

export const needsMeasurementLabel = "needs-measurement";

export function normalizeInventoryLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isInventoryUserLabel(value: string | null | undefined): value is string {
  return Boolean(value) && !isInventoryAuditTag(value) && !isInventoryAuditSuppressionTag(value);
}

export function formatInventoryLabel(value: string) {
  if (value === needsMeasurementLabel) return "Needs measurement";

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
