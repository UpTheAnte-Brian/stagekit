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
export type InventoryAuditSuppressionTag =
  | "audit-ignore-unreadable-photo"
  | "audit-ignore-bad-image"
  | "audit-ignore-duplicate-candidate";

export const inventoryAuditTagValues = inventoryAuditTagConfig.map((entry) => entry.tag);
export const inventoryAuditSuppressionTagByTag: Record<InventoryAuditTag, InventoryAuditSuppressionTag> = {
  "audit-unreadable-photo": "audit-ignore-unreadable-photo",
  "audit-bad-image": "audit-ignore-bad-image",
  "audit-duplicate-candidate": "audit-ignore-duplicate-candidate",
};
export const inventoryAuditSuppressionTagValues = Object.values(inventoryAuditSuppressionTagByTag);

export function isInventoryAuditTag(value: string | null | undefined): value is InventoryAuditTag {
  return inventoryAuditTagValues.includes(value as InventoryAuditTag);
}

export function isInventoryAuditSuppressionTag(value: string | null | undefined): value is InventoryAuditSuppressionTag {
  return inventoryAuditSuppressionTagValues.includes(value as InventoryAuditSuppressionTag);
}

export function hasAnyInventoryAuditTag(tags: string[] | null | undefined) {
  return (tags ?? []).some((tag) => isInventoryAuditTag(tag));
}
