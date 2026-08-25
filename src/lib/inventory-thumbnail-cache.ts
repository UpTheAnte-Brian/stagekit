const INVENTORY_THUMBNAIL_CACHE_STORAGE_KEY = "stagekit:inventory-thumbnails:v2";
const INVENTORY_THUMBNAIL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CachedThumbnail = {
  expiresAt: number;
  url: string;
};

const thumbnailCache = new Map<string, CachedThumbnail>();
let didHydrateThumbnailCache = false;

function canUseSessionStorage() {
  return typeof window !== "undefined";
}

function hydrateThumbnailCache() {
  if (!canUseSessionStorage() || didHydrateThumbnailCache) {
    return;
  }

  didHydrateThumbnailCache = true;

  const rawValue = sessionStorage.getItem(INVENTORY_THUMBNAIL_CACHE_STORAGE_KEY);
  if (!rawValue) {
    return;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, CachedThumbnail>;
    const now = Date.now();

    Object.entries(parsed).forEach(([itemId, cachedThumbnail]) => {
      if (itemId && cachedThumbnail?.url && cachedThumbnail.expiresAt > now) {
        thumbnailCache.set(itemId, cachedThumbnail);
      }
    });
  } catch {
    sessionStorage.removeItem(INVENTORY_THUMBNAIL_CACHE_STORAGE_KEY);
  }
}

function persistThumbnailCache() {
  if (!canUseSessionStorage()) {
    return;
  }

  sessionStorage.setItem(INVENTORY_THUMBNAIL_CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(thumbnailCache)));
}

export function getCachedInventoryThumbnails(itemIds: string[]) {
  hydrateThumbnailCache();

  return itemIds.reduce<Record<string, string>>((accumulator, itemId) => {
    const cachedThumbnail = thumbnailCache.get(itemId);
    if (cachedThumbnail?.expiresAt && cachedThumbnail.expiresAt > Date.now()) {
      accumulator[itemId] = cachedThumbnail.url;
    } else if (cachedThumbnail) {
      thumbnailCache.delete(itemId);
    }
    return accumulator;
  }, {});
}

export function primeInventoryThumbnailCache(thumbnails: Record<string, string>) {
  hydrateThumbnailCache();

  let didChange = false;
  const expiresAt = Date.now() + INVENTORY_THUMBNAIL_CACHE_TTL_MS;
  Object.entries(thumbnails).forEach(([itemId, url]) => {
    const cachedThumbnail = thumbnailCache.get(itemId);
    if (!itemId || !url || (cachedThumbnail?.url === url && cachedThumbnail.expiresAt > Date.now())) {
      return;
    }

    thumbnailCache.set(itemId, { url, expiresAt });
    didChange = true;
  });

  if (didChange) {
    persistThumbnailCache();
  }
}
