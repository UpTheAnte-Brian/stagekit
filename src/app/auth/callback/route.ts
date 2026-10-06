import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/inventory";
  const code = request.nextUrl.searchParams.get("code");
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = next.startsWith("/") ? next : "/inventory";
  redirectUrl.search = "";
  const response = NextResponse.redirect(redirectUrl);

  if (!code) return NextResponse.redirect(new URL("/login?message=Your invitation link is invalid or has expired.", request.url));

  const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(error.message)}`, request.url));
  return response;
}
