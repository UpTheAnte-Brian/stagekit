import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

function getRequiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function createBrowserSupabaseClient(options?: { fetch?: typeof fetch }) {
  return createBrowserClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    options?.fetch
      ? {
          global: { fetch: options.fetch },
          // Upload requests use a request-specific timeout, so they must not
          // reuse the default browser client that has a different fetch setup.
          isSingleton: false,
        }
      : undefined,
  );
}
