import type { SelectHTMLAttributes } from "react";

import { inventoryCategorySuggestionValues, inventoryCategoryTaxonomy } from "@/lib/inventory-taxonomy";

type InventoryCategorySelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children" | "defaultValue"> & {
  defaultValue?: string | null;
  additionalOptions?: string[];
  filterMode?: boolean;
};

const knownCategoryValues = new Set(inventoryCategorySuggestionValues);

export function InventoryCategorySelect({
  additionalOptions = [],
  defaultValue,
  filterMode = false,
  ...selectProps
}: InventoryCategorySelectProps) {
  const selectedCategory = defaultValue?.trim() ?? "";
  const legacyCategories = [...new Set([...additionalOptions, selectedCategory])]
    .map((category) => category.trim())
    .filter((category) => category.length > 0 && !knownCategoryValues.has(category))
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

  return (
    <select {...selectProps} defaultValue={selectedCategory}>
      <option value="">{filterMode ? "All categories" : "Choose a category"}</option>
      {inventoryCategoryTaxonomy.map((section) => (
        <optgroup key={section.family} label={section.family}>
          <option value={section.family}>{filterMode ? `All ${section.family}` : section.family}</option>
          {section.groups.flatMap((group) =>
            group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value}
              </option>
            )),
          )}
        </optgroup>
      ))}
      {legacyCategories.length > 0 ? (
        <optgroup label="Legacy categories">
          {legacyCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}
