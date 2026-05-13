/**
 * Google Tag Manager loader.
 *
 * Set NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX in your environment to activate.
 * No-op when the variable is absent so dev builds stay clean.
 *
 * The noscript <iframe> fallback is rendered inside <body> via layout.tsx.
 * A client-side route tracker pushes page_view events to dataLayer on every
 * App Router navigation so GTM's built-in pageview tags fire correctly.
 *
 * To track GA4: add a GA4 Configuration tag in GTM (Tag → GA4 Configuration)
 * and point it at your Measurement ID. No extra code needed here.
 */

import Script from "next/script";
import { GtmRouteTracker } from "@/components/Analytics";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-5NG87RK5";

export function GoogleTagManager() {
  if (!GTM_ID) return null;

  return (
    <>
      {/* GTM script — loads the container */}
      <Script id="gtm-script" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){
            w[l]=w[l]||[];
            w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),
                dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;
            j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
            f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>

      {/* Push page_view to dataLayer on every SPA route change */}
      <GtmRouteTracker />
    </>
  );
}

/** Renders the GTM <noscript> iframe — call this inside <body> in layout.tsx */
export function GoogleTagManagerNoscript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="GTM noscript"
      />
    </noscript>
  );
}
