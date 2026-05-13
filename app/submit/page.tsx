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
        <h1 className="heading-rule font-serif text-3xl font-semibold text-navy-800">
          Submit an Event
        </h1>
        <p className="mt-3 text-sm text-walnut leading-relaxed">
          Know about something great happening in Bergen County? Tell us about it.
          We review every submission and publish approved events within{" "}
          <strong className="text-navy-800">2 business days</strong>.
          You&apos;ll get an email with a private link to edit your listing any time.
        </p>
      </div>

      <SubmitForm categories={categories} />
    </div>
  );
}
