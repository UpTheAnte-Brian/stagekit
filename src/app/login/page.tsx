import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function authAction(formData: FormData) {
  "use server";

  const email = readString(formData.get("email"));
  const password = readString(formData.get("password"));
  const nextPath = readString(formData.get("next")) || "/inventory";
  const intent = readString(formData.get("intent"));

  if (!email || !password) {
    redirect(`/login?message=${encodeURIComponent("Email and password are required.")}`);
  }

  const supabase = await createServerSupabaseClient();
  if (intent === "signup") {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      redirect(`/login?message=${encodeURIComponent(error.message)}`);
    }
    redirect(nextPath);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  redirect(nextPath);
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = firstValue(params.next) ?? "/inventory";
  const message = firstValue(params.message);

  return (
    <section className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">StageKit</h1>
      <p className="mt-1 text-sm text-muted">Sign in or create an account to manage inventory and jobs.</p>
      {message ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </p>
      ) : null}
      <form action={authAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            name="intent"
            value="signin"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Sign In
          </button>
          <button
            type="submit"
            name="intent"
            value="signup"
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium"
          >
            Sign Up
          </button>
        </div>
      </form>
    </section>
  );
}
