/**
 * Loads Google Analytics 4 (GA4) in the root layout.
 *
 * Set NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX in your environment to activate.
 * The component is a no-op when the variable is absent, so dev builds
 * stay clean and you never accidentally track localhost traffic.
 *
 * Includes a client-side route-change tracker (Analytics) so every
 * App Router navigation registers as a page view in GA4.
 *
 * Prefer Plausible? Swap out the Script tags and gtag calls for the
 * Plausible snippet — the Analytics client component pattern is the same.
 */

import Script from "next/script";
import { Analytics } from "@/components/Analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      {/* Load the gtag.js library */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />

      {/* Initialise dataLayer and fire the first page view */}
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            cookie_flags: 'SameSite=None;Secure',
            anonymize_ip: true
          });
        `}
      </Script>

      {/* SPA route-change tracker */}
      <Analytics gaId={GA_ID} />
    </>
  );
}
