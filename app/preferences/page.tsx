import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { PreferencesForm } from "@/components/PreferencesForm";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { token?: string; saved?: string; unsubscribed?: string };
}

export default async function PreferencesPage({ searchParams }: Props) {
  const token = searchParams.token?.trim();

  if (!token) notFound();

  const supabase = createAdminSupabaseClient();

  // Look up subscriber by token
  const { data: subscriber } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, confirmed, preferences, unsubscribed_at")
    .eq("token", token)
    .maybeSingle();

  // Allow the post-unsubscribe confirmation screen to render even though
  // unsubscribed_at is now set — only 404 when we're NOT in that state.
  const isUnsubscribedConfirm = searchParams.unsubscribed === "1";
  if (!subscriber) notFound();
  if (subscriber.unsubscribed_at && !isUnsubscribedConfirm) notFound();

  const saved = searchParams.saved === "1";
  const unsubscribed = searchParams.unsubscribed === "1";

  // Skip extra DB fetches when just showing the unsubscribed confirmation.
  const [neighborhoods, categories, prefs] = unsubscribed
    ? [[], [], {}]
    : await (async () => {
        const [{ data: nb }, { data: cat }] = await Promise.all([
          supabase.from("neighborhoods").select("id, name, slug").order("name"),
          supabase.from("categories").select("id, name, slug, icon").order("name"),
        ]);
        const p = (subscriber.preferences ?? {}) as {
          neighborhoods?: string[];
          categories?: string[];
          frequency?: string;
        };
        return [nb ?? [], cat ?? [], p];
      })();

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="mx-auto max-w-xl px-4 py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-bold text-navy-800">🎵 Bergen Beat</a>
          <h1 className="mt-4 text-xl font-semibold text-navy-800">
            Email Preferences
          </h1>
          <p className="mt-1 text-sm text-walnut">{subscriber.email}</p>
        </div>

        {unsubscribed ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
            <p className="text-2xl mb-3">👋</p>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">You're unsubscribed</h2>
            <p className="text-sm text-gray-500">
              You won't receive any more emails from Bergen Beat. 
              Changed your mind?{" "}
              <a href="/" className="text-accent-orange hover:underline">
                Subscribe again
              </a>
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-cream-200 bg-white p-6 shadow-sm">
            {saved && (
              <div className="mb-5 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700">
                ✓ Preferences saved!
              </div>
            )}
            <PreferencesForm
              token={token}
              subscriberId={subscriber.id}
              currentPrefs={prefs as { neighborhoods?: string[]; categories?: string[]; frequency?: string }}
              neighborhoods={neighborhoods as { id: string; name: string; slug: string }[]}
              categories={categories as { id: string; name: string; slug: string; icon: string | null }[]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
