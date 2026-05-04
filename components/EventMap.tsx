"use client";

import { useEffect, useRef } from "react";

interface Props {
  lat: number;
  lng: number;
  label: string;
}

export function EventMap({ lat, lng, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn("EventMap: NEXT_PUBLIC_MAPBOX_TOKEN is not set");
      return;
    }

    import("mapbox-gl").then((mapboxgl) => {
      import("mapbox-gl/dist/mapbox-gl.css");

      mapboxgl.default.accessToken = token;

      const map = new mapboxgl.default.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom: 14,
        interactive: false,
      });

      new mapboxgl.default.Marker({ color: "#0284c7" })
        .setLngLat([lng, lat])
        .addTo(map);

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div
        ref={containerRef}
        className="h-48 w-full"
        aria-label={`Map showing location of ${label}`}
      />
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 bg-gray-50 py-2 text-xs text-gray-500 hover:text-brand-600"
      >
        <span>📍</span> Open in Google Maps
      </a>
    </div>
  );
}
