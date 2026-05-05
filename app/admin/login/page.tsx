import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const metadata: Metadata = { title: "Admin Login" };

async function sendMagicLink(formData: FormData) {
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
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  // Redirect to a confirmation page regardless of outcome
  // (avoids leaking whether the email exists)
  redirect("/admin/login?sent=1");
}

interface Props {
  searchParams: { sent?: string; error?: string };
}

export default function AdminLoginPage({ searchParams }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <h1 className="mb-1 text-xl font-bold text-gray-900">Bergen Beat Admin</h1>

        {searchParams.sent ? (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Check your inbox — we sent a login link to your email.
            </p>
            <p className="mt-4 text-xs text-gray-400">
              Didn&apos;t get it? Check your spam folder, or{" "}
              <a href="/admin/login" className="text-brand-600 hover:underline">
                try again
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500">
              Enter your email to receive a magic login link.
            </p>

            {searchParams.error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                Login failed — the link may have expired. Please try again.
              </p>
            )}

            <form action={sendMagicLink} className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="admin@bergenbeat.net"
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Send login link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
