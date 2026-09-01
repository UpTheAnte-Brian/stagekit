"use client";

import { useRouter } from "next/navigation";

import { normalizeInventoryReturnTo } from "@/lib/inventory-navigation";

type BackToInventoryButtonProps = {
  fallbackHref: string;
};

export function BackToInventoryButton({ fallbackHref }: BackToInventoryButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    const normalizedFallbackHref = normalizeInventoryReturnTo(fallbackHref) ?? "/inventory";
    router.push(normalizedFallbackHref);
  };

  return (
    <button className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium" onClick={handleClick} type="button">
      Back to Inventory
    </button>
  );
}
