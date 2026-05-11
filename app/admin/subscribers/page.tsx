import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { SubscriberTable } from "@/components/SubscriberTable";
import type { SubscriberRow } from "@/components/SubscriberTable";
import { SendTestDigest } from "@/components/admin/SendTestDigest";

export const revalidate = 0;

export default async function SubscribersPage() {
  const supabase = createAdminSupabaseClient();

  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, confirmed, subscribed_at")
    .order("subscribed_at", { ascending: false });

  const subscribers = (data ?? []) as SubscriberRow[];

  const total = subscribers.length;
  const confirmed = subscribers.filter((s) => s.confirmed).length;
  const pending = total - confirmed;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscribers</h1>
          <p className="mt-1 text-sm text-gray-400">
            {confirmed} confirmed · {pending} pending · {total} total
          </p>
        </div>
        {confirmed > 0 && (
          <a
            href="/api/admin/subscribers/export"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            ↓ Export CSV
          </a>
        )}
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <p className="text-xs text-gray-500">Confirmed</p>
          <p className="mt-1 text-3xl font-bold text-navy-800">{confirmed}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <p className="text-xs text-gray-500">Pending confirmation</p>
          <p className={`mt-1 text-3xl font-bold ${pending > 0 ? "text-amber-500" : "text-gray-900"}`}>
            {pending}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <p className="text-xs text-gray-500">Total</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{total}</p>
        </div>
      </div>

      <div className="mb-8">
        <SendTestDigest adminEmail={process.env.ADMIN_EMAIL ?? "admin@bergenbeat.net"} />
      </div>

      <SubscriberTable subscribers={subscribers} />
    </>
  );
}
