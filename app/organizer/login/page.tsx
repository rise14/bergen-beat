import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const metadata: Metadata = { title: "Organizer Login | Bergen Beat" };

async function sendOrganizerMagicLink(formData: FormData) {
  "use server";

  const email = formData.get("email") as string;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: Record<string, unknown>) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: Record<string, unknown>) { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );

  await supabase.auth.signInWithOtp({
    email,
    options: {
      // Pass next=/organizer so the callback redirects here, not /admin
      emailRedirectTo: `${siteUrl}/auth/callback?next=/organizer`,
    },
  });

  redirect("/organizer/login?sent=1");
}

interface Props {
  searchParams: { sent?: string; error?: string };
}

export default function OrganizerLoginPage({ searchParams }: Props) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-orange">
          Organizer Portal
        </p>
        <h1 className="text-xl font-bold text-navy-800">Manage your events</h1>

        {searchParams.sent ? (
          <>
            <p className="mt-4 text-sm text-gray-600">
              Check your inbox — we sent a login link. Click it to view and manage your listings.
            </p>
            <p className="mt-3 text-xs text-gray-400">
              Didn&apos;t get it?{" "}
              <a href="/organizer/login" className="text-accent-orange hover:underline">
                Try again
              </a>
            </p>
          </>
        ) : (
          <>
            <p className="mb-6 mt-2 text-sm text-gray-500">
              Enter the email you used when submitting your event. We&apos;ll send a secure login link — no password needed.
            </p>

            {searchParams.error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                Login link expired or invalid. Please try again.
              </p>
            )}

            <form action={sendOrganizerMagicLink} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-navy-700 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-900"
              >
                Send login link →
              </button>
            </form>

            <p className="mt-6 text-xs text-gray-400">
              Haven&apos;t submitted an event yet?{" "}
              <a href="/submit" className="text-accent-orange hover:underline">
                Submit yours free →
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
