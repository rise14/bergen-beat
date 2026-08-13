/**
 * Default Bergen Beat OG card for this segment.
 *
 * Required per segment: Next.js does not inherit a parent segment's
 * opengraph-image once this route declares its own `openGraph` metadata,
 * which is what left these pages with no og:image (Ahrefs: "Open Graph tags
 * incomplete").
 */
export { default, size, contentType, alt } from "@/components/og/DefaultOGImage";
