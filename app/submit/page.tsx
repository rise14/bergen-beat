import type { Metadata } from "next";
import { SubmitForm } from "@/components/SubmitForm";
import { getCategories } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Submit an Event",
  description:
    "Know about a great local event in Bergen County? Submit it to Bergen Beat and we'll review it within 2 business days.",
};

export default async function SubmitPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Submit an Event</h1>
        <p className="mt-2 text-gray-500">
          Know about something great happening in Bergen County? Tell us about it.
          We review every submission and publish approved events within 2 business days.
        </p>
      </div>

      <SubmitForm categories={categories} />
    </div>
  );
}
