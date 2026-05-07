/**
 * Geolocation helpers for Bergen Beat.
 */

export const DEFAULT_RADIUS_MILES = 10;

/** Haversine formula — returns distance in miles between two lat/lng points. */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Rough bounding-box check — cheap pre-filter before full Haversine. */
export function withinBoundingBox(
  userLat: number,
  userLng: number,
  venueLat: number,
  venueLng: number,
  radiusMiles: number
): boolean {
  const latDelta = radiusMiles / 69.0;           // ~69 miles per degree lat
  const lngDelta = radiusMiles / (69.0 * Math.cos(toRad(userLat)));
  return (
    Math.abs(venueLat - userLat) <= latDelta &&
    Math.abs(venueLng - userLng) <= lngDelta
  );
}
