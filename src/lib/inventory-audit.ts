export const inventoryAuditTagConfig = [
  {
    tag: "audit-unreadable-photo",
    label: "Unreadable Photos",
    description: "Items whose stored photo could not be downloaded or analyzed.",
  },
  {
    tag: "audit-bad-image",
    label: "Bad Images",
    description: "Items flagged for low-resolution or low-quality primary photos.",
  },
  {
    tag: "audit-duplicate-candidate",
    label: "Duplicate Candidates",
    description: "Items flagged as likely duplicates and ready for review.",
  },
] as const;

export type InventoryAuditTag = (typeof inventoryAuditTagConfig)[number]["tag"];

export const inventoryAuditTagValues = inventoryAuditTagConfig.map((entry) => entry.tag);

export function isInventoryAuditTag(value: string | null | undefined): value is InventoryAuditTag {
  return inventoryAuditTagValues.includes(value as InventoryAuditTag);
}

export function hasAnyInventoryAuditTag(tags: string[] | null | undefined) {
  return (tags ?? []).some((tag) => isInventoryAuditTag(tag));
}
