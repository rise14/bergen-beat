/**
 * Default Bergen Beat OG card for this segment.
 *
 * This route now declares its own `openGraph` metadata (it previously emitted no
 * og:url), which replaces the parent object — including the inherited image. The
 * co-located image file keeps og:image intact.
 */
export { default, size, contentType, alt } from "@/components/og/DefaultOGImage";
