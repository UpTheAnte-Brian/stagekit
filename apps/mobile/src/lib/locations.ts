import type { Database } from "./database";
import { getSupabaseClient } from "./supabase";

export type Location = Pick<Database["public"]["Tables"]["locations"]["Row"], "id" | "name" | "kind"> & {
  address_label: string | null;
  latitude: number | null;
  longitude: number | null;
};

export async function listLocations() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("locations").select("id,name,kind").order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Pick<Database["public"]["Tables"]["locations"]["Row"], "id" | "name" | "kind">[]).map((location) => ({
    ...location,
    address_label: null,
    latitude: null,
    longitude: null,
  }));
}
