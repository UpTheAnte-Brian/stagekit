const INVENTORY_THUMBNAIL_CACHE_STORAGE_KEY = "stagekit:inventory-thumbnails";

const thumbnailCache = new Map<string, string>();
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
    const parsed = JSON.parse(rawValue) as Record<string, string>;
    Object.entries(parsed).forEach(([itemId, url]) => {
      if (itemId && url) {
        thumbnailCache.set(itemId, url);
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
    const cachedUrl = thumbnailCache.get(itemId);
    if (cachedUrl) {
      accumulator[itemId] = cachedUrl;
    }
    return accumulator;
  }, {});
}

export function primeInventoryThumbnailCache(thumbnails: Record<string, string>) {
  hydrateThumbnailCache();

  let didChange = false;
  Object.entries(thumbnails).forEach(([itemId, url]) => {
    if (!itemId || !url || thumbnailCache.get(itemId) === url) {
      return;
    }

    thumbnailCache.set(itemId, url);
    didChange = true;
  });

  if (didChange) {
    persistThumbnailCache();
  }
}
