import type { Metadata } from "next";
import "./globals.css";

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
  verification: {
    google: "9eOqTpmb1kK_HjXtw-PdRBTNApE1HcesLozFyQ9_kjc",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center">
              <img
                src="/bergen-beat-logo.png"
                alt="Bergen Beat"
                className="h-8 w-auto"
              />
            </a>
            <nav className="flex items-center gap-6 text-sm text-gray-600">
              <a href="/events" className="hover:text-brand-600">Events</a>
              <a href="/categories" className="hover:text-brand-600">Categories</a>
              <a href="/neighborhoods" className="hover:text-brand-600">Neighborhoods</a>
              <a href="/submit" className="rounded-lg bg-brand-600 px-4 py-1.5 text-white hover:bg-brand-700">
                Submit an Event
              </a>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>

        <footer className="mt-16 border-t border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500 flex flex-col sm:flex-row justify-between gap-4">
            <p>© {new Date().getFullYear()} Bergen Beat. Events in Bergen County, NJ.</p>
            <nav className="flex gap-4">
              <a href="/events" className="hover:text-brand-600">Events</a>
              <a href="/categories" className="hover:text-brand-600">Categories</a>
              <a href="/neighborhoods" className="hover:text-brand-600">Neighborhoods</a>
              <a href="/submit" className="hover:text-brand-600">Submit Event</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
