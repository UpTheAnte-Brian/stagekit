import AsyncStorage from "@react-native-async-storage/async-storage";

import { getSupabaseClient } from "./supabase";

const SIGNED_PHOTO_URL_CACHE_KEY = "stagekit:signed-photo-url-cache:v1";
const SIGNED_PHOTO_URL_CACHE_REFRESH_MARGIN_MS = 60 * 60 * 1000;
const MAX_SIGNED_PHOTO_URL_CACHE_ENTRIES = 1_500;
const DEFAULT_PHOTO_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

export const THUMBNAIL_TRANSFORM = {
  width: 240,
  height: 240,
  resize: "cover",
  quality: 60,
} as const;

export type InventoryPhotoRow = {
  id: string;
  item_id: string;
  storage_bucket: string;
  storage_path: string;
  thumbnail_storage_path: string | null;
  sort_order: number;
};

export type PhotoTransform = {
  width: number;
  height: number;
  resize: "cover" | "contain" | "fill";
  quality: number;
};

type SignedPhotoUrlCacheEntry = {
  expiresAt: number;
  url: string;
};

const signedPhotoUrlCache = new Map<string, SignedPhotoUrlCacheEntry>();
let cacheHydrationPromise: Promise<void> | null = null;
let cacheWritePromise: Promise<void> | null = null;

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getPhotoStorageKey(bucket: string, storagePath: string) {
  return `${bucket}:${storagePath}`;
}

function getSignedPhotoUrlCacheKey(bucket: string, storagePath: string, transform?: PhotoTransform) {
  return JSON.stringify([bucket, storagePath, transform ?? null]);
}

function isFreshCacheEntry(entry: SignedPhotoUrlCacheEntry) {
  return entry.expiresAt - SIGNED_PHOTO_URL_CACHE_REFRESH_MARGIN_MS > Date.now();
}

async function hydrateSignedPhotoUrlCache() {
  if (cacheHydrationPromise) {
    return cacheHydrationPromise;
  }

  cacheHydrationPromise = AsyncStorage.getItem(SIGNED_PHOTO_URL_CACHE_KEY)
    .then((rawCache) => {
      if (!rawCache) {
        return;
      }

      const parsedCache = JSON.parse(rawCache) as Record<string, SignedPhotoUrlCacheEntry>;
      for (const [key, entry] of Object.entries(parsedCache)) {
        if (entry?.url && Number.isFinite(entry.expiresAt) && isFreshCacheEntry(entry)) {
          signedPhotoUrlCache.set(key, entry);
        }
      }
    })
    .catch((error) => {
      console.warn("Failed to load signed photo URL cache.", error);
    });

  return cacheHydrationPromise;
}

function setCachedSignedPhotoUrl(bucket: string, storagePath: string, url: string, expiresInSeconds: number, transform?: PhotoTransform) {
  const key = getSignedPhotoUrlCacheKey(bucket, storagePath, transform);

  signedPhotoUrlCache.delete(key);
  signedPhotoUrlCache.set(key, {
    expiresAt: Date.now() + expiresInSeconds * 1000,
    url,
  });
}

function getCachedSignedPhotoUrl(bucket: string, storagePath: string, transform?: PhotoTransform) {
  const cached = signedPhotoUrlCache.get(getSignedPhotoUrlCacheKey(bucket, storagePath, transform));

  return cached && isFreshCacheEntry(cached) ? cached.url : null;
}

async function persistSignedPhotoUrlCache() {
  if (cacheWritePromise) {
    return cacheWritePromise;
  }

  cacheWritePromise = Promise.resolve()
    .then(async () => {
      const freshEntries = [...signedPhotoUrlCache.entries()]
        .filter(([, entry]) => isFreshCacheEntry(entry))
        .slice(-MAX_SIGNED_PHOTO_URL_CACHE_ENTRIES);

      signedPhotoUrlCache.clear();
      for (const [key, entry] of freshEntries) {
        signedPhotoUrlCache.set(key, entry);
      }

      await AsyncStorage.setItem(SIGNED_PHOTO_URL_CACHE_KEY, JSON.stringify(Object.fromEntries(freshEntries)));
    })
    .catch((error) => {
      console.warn("Failed to persist signed photo URL cache.", error);
    })
    .finally(() => {
      cacheWritePromise = null;
    });

  return cacheWritePromise;
}

export async function createSignedPhotoUrlMap(
  photos: InventoryPhotoRow[],
  transform?: PhotoTransform,
  expiresInSeconds = DEFAULT_PHOTO_URL_TTL_SECONDS,
) {
  await hydrateSignedPhotoUrlCache();

  const supabase = getSupabaseClient();
  const signedUrlByKey = new Map<string, string>();
  const targets = photos.map((photo) => ({
    bucket: photo.storage_bucket,
    key: getPhotoStorageKey(photo.storage_bucket, photo.storage_path),
    storagePath: transform && photo.thumbnail_storage_path ? photo.thumbnail_storage_path : photo.storage_path,
    transform: transform && !photo.thumbnail_storage_path ? transform : undefined,
  }));
  const transformedTargets = targets.filter((target) => target.transform);
  const directTargets = targets.filter((target) => !target.transform);
  let didUpdateCache = false;

  try {
    for (const targetChunk of chunkArray(transformedTargets, 20)) {
      const uncachedTargets = targetChunk.filter((target) => {
        const cachedUrl = getCachedSignedPhotoUrl(target.bucket, target.storagePath, target.transform);
        if (cachedUrl) {
          signedUrlByKey.set(target.key, cachedUrl);
          return false;
        }

        return true;
      });

      const signedUrlResults = await Promise.all(
        uncachedTargets.map(async (target) => {
          const { data, error } = await supabase.storage.from(target.bucket).createSignedUrl(target.storagePath, expiresInSeconds, {
            transform: target.transform,
          });

          if (error) {
            throw new Error(error.message);
          }

          return { ...target, signedUrl: data.signedUrl };
        }),
      );

      for (const entry of signedUrlResults) {
        if (entry.signedUrl) {
          setCachedSignedPhotoUrl(entry.bucket, entry.storagePath, entry.signedUrl, expiresInSeconds, entry.transform);
          signedUrlByKey.set(entry.key, entry.signedUrl);
          didUpdateCache = true;
        }
      }
    }
  } catch (error) {
    console.warn("Falling back to untransformed photo URLs.", error);
    return createSignedPhotoUrlMap(photos, undefined, expiresInSeconds);
  }

  const directTargetsByBucket = new Map<string, typeof directTargets>();
  for (const target of directTargets) {
    const bucketTargets = directTargetsByBucket.get(target.bucket) ?? [];
    bucketTargets.push(target);
    directTargetsByBucket.set(target.bucket, bucketTargets);
  }

  for (const [bucket, bucketTargets] of directTargetsByBucket.entries()) {
    const targetsByPath = new Map<string, typeof directTargets>();
    for (const target of bucketTargets) {
      const cachedUrl = getCachedSignedPhotoUrl(bucket, target.storagePath);
      if (cachedUrl) {
        signedUrlByKey.set(target.key, cachedUrl);
        continue;
      }

      const pathTargets = targetsByPath.get(target.storagePath) ?? [];
      pathTargets.push(target);
      targetsByPath.set(target.storagePath, pathTargets);
    }

    for (const pathChunk of chunkArray([...targetsByPath.keys()], 100)) {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(pathChunk, expiresInSeconds);
      if (error) {
        throw new Error(error.message);
      }

      for (const entry of data ?? []) {
        if (!entry.path || !entry.signedUrl) {
          continue;
        }

        setCachedSignedPhotoUrl(bucket, entry.path, entry.signedUrl, expiresInSeconds);
        for (const target of targetsByPath.get(entry.path) ?? []) {
          signedUrlByKey.set(target.key, entry.signedUrl);
        }
        didUpdateCache = true;
      }
    }
  }

  if (didUpdateCache) void persistSignedPhotoUrlCache();

  return signedUrlByKey;
}
