export function crossItemPhotoGroups(groups) {
  return groups.filter((group) => new Set(group.photos.map((photo) => photo.item_id)).size > 1);
}

export function syncAuditTags(existingTags, candidateTags, suppressionByTag, sync) {
  const auditTags = Object.keys(suppressionByTag);
  const allowed = candidateTags.filter((tag) => !existingTags.includes(suppressionByTag[tag]));
  const base = sync ? existingTags.filter((tag) => !auditTags.includes(tag)) : existingTags;
  const manual = existingTags.includes("audit-manual-duplicate-candidate") && !existingTags.includes("audit-ignore-duplicate-candidate")
    ? ["audit-duplicate-candidate"] : [];
  return [...new Set([...base, ...allowed, ...manual])].sort();
}
