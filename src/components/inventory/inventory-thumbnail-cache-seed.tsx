"use client";

import { useEffect } from "react";

import { primeInventoryThumbnailCache } from "@/lib/inventory-thumbnail-cache";

type InventoryThumbnailCacheSeedProps = {
  itemId: string;
  thumbnailUrl: string | null;
};

export function InventoryThumbnailCacheSeed({ itemId, thumbnailUrl }: InventoryThumbnailCacheSeedProps) {
  useEffect(() => {
    if (!thumbnailUrl) {
      return;
    }

    primeInventoryThumbnailCache({
      [itemId]: thumbnailUrl,
    });
  }, [itemId, thumbnailUrl]);

  return null;
}
