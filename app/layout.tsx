import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { buildOrganizationJsonLd } from "@/lib/seo";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bergen Beat — Events in Bergen County, NJ",
    template: "%s | Bergen Beat",
  },
  description:
    "Discover the best local events in Bergen County, NJ — concerts, markets, festivals, food events, and more.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergenbeat.net"
  ),
  openGraph: {
    siteName: "Bergen Beat",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: "Bergen Beat — Events in Bergen County, NJ" },
      ],
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgJsonLd = buildOrganizationJsonLd();

  return (
    <html lang="en" className={lora.variable}>
      <head>
        {/* Preconnect to external image/tile domains so they resolve before first paint */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://s1.ticketm.net" />
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://events.mapbox.com" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <GoogleAnalytics />
        <SiteHeader />

        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>

        {/* Navy footer — Idea 3 */}
        <footer className="mt-16 bg-navy-800">
          <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-white">🎵 Bergen Beat</p>
              <p className="mt-1 text-xs text-sky">Events in Bergen County, NJ</p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a href="/events"         className="text-sky hover:text-white transition-colors">Events</a>
              <a href="/categories"     className="text-sky hover:text-white transition-colors">Categories</a>
              <a href="/neighborhoods"  className="text-sky hover:text-white transition-colors">Neighborhoods</a>
              <a href="/newsletter"     className="text-sky hover:text-white transition-colors">Newsletter</a>
              <a href="/submit"         className="text-accent-orange hover:text-white transition-colors font-medium">Submit Event</a>
            </nav>
          </div>
          <div className="border-t border-navy-700">
            <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-sky/60">
              © {new Date().getFullYear()} Bergen Beat. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
