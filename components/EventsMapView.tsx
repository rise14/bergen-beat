"use client";

import { useEffect, useRef, useState } from "react";
import type { Event } from "@/types";
import { formatShortDate, formatEventTime } from "@/lib/dates";

interface MapEvent {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  is_free: boolean;
  banner_url: string | null;
  category: { name: string; icon: string | null; color: string | null } | null;
  venue: { name: string; city: string | null; lat: number; lng: number } | null;
}

interface Props {
  events: Event[];
}

export function EventsMapView({ events }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [activeEvent, setActiveEvent] = useState<MapEvent | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Only events with coordinates
  const mappable = (events as unknown as MapEvent[]).filter(
    (e) => e.venue?.lat && e.venue?.lng
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    import("mapbox-gl").then((mod) => {
      const mapboxgl = mod.default;
      mapboxgl.accessToken = token;

      // Centre on Bergen County NJ
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-74.0776, 40.9276],
        zoom: 10,
      });

      map.on("load", () => {
        setMapReady(true);

        mappable.forEach((event) => {
          if (!event.venue?.lat || !event.venue?.lng) return;

          const el = document.createElement("div");
          el.className = "event-pin";
          el.style.cssText = `
            width: 36px; height: 36px; border-radius: 50%;
            background: #1a2e5a; border: 2.5px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 16px;
            transition: transform 0.15s, background 0.15s;
          `;
          el.textContent = event.category?.icon ?? "📅";
          el.title = event.title;

          el.addEventListener("mouseenter", () => {
            el.style.transform = "scale(1.2)";
            el.style.background = "#dc8f53";
          });
          el.addEventListener("mouseleave", () => {
            el.style.transform = "scale(1)";
            el.style.background = "#1a2e5a";
          });
          el.addEventListener("click", () => setActiveEvent(event));

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([event.venue.lng, event.venue.lat])
            .addTo(map);

          markersRef.current.push(marker);
        });

        // Fit map to markers if we have any
        if (mappable.length > 0) {
          const lngs = mappable.map((e) => e.venue!.lng);
          const lats = mappable.map((e) => e.venue!.lat);
          const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
          const minLat = Math.min(...lats), maxLat = Math.max(...lats);
          map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
            padding: 60, maxZoom: 13, duration: 0,
          });
        }
      });

      // Close popup on map click
      map.on("click", () => setActiveEvent(null));

      mapRef.current = map;
    });

    return () => {
      (mapRef.current as { remove?: () => void })?.remove?.();
      mapRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unmapped = events.length - mappable.length;

  return (
    <div className="relative">
      {/* Map container */}
      <div
        ref={containerRef}
        className="h-[60vh] min-h-[400px] w-full overflow-hidden rounded-2xl border border-cream-200"
      />

      {/* Count badge */}
      {mapReady && (
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-navy-800 shadow-sm backdrop-blur-sm">
          {mappable.length} event{mappable.length !== 1 ? "s" : ""} on map
          {unmapped > 0 && (
            <span className="ml-1 text-walnut/60">· {unmapped} without location</span>
          )}
        </div>
      )}

      {/* Event popup card */}
      {activeEvent && (
        <div className="absolute bottom-4 left-1/2 z-10 w-80 -translate-x-1/2 rounded-xl border border-cream-200 bg-white shadow-lg">
          <button
            onClick={() => setActiveEvent(null)}
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
          <a href={`/events/${activeEvent.slug}`} className="block p-4 hover:bg-cream-50 rounded-xl transition-colors">
            <div className="flex gap-3">
              {/* Icon / thumbnail */}
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl"
                style={{ background: activeEvent.category?.color ?? "#f5e6d0" }}
              >
                {activeEvent.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeEvent.banner_url} alt="" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  activeEvent.category?.icon ?? "📅"
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-serif text-sm font-semibold text-navy-800">
                  {activeEvent.title}
                </p>
                <p className="mt-0.5 text-xs text-walnut">
                  {formatShortDate(activeEvent.start_date)} · {formatEventTime(activeEvent.start_date)}
                </p>
                <p className="mt-0.5 truncate text-xs text-walnut/70">
                  {activeEvent.venue?.name}{activeEvent.venue?.city ? `, ${activeEvent.venue.city}` : ""}
                </p>
              </div>
            </div>
            {activeEvent.is_free && (
              <span className="mt-2 inline-block rounded-full bg-accent-orange px-2 py-0.5 text-xs font-semibold text-white">
                Free
              </span>
            )}
            <p className="mt-2 text-xs font-medium text-accent-orange">View details →</p>
          </a>
        </div>
      )}

      {/* No location fallback */}
      {mappable.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
          <div className="text-center text-walnut">
            <p className="text-2xl mb-2">📍</p>
            <p className="text-sm font-medium">No events have location data yet.</p>
            <p className="mt-1 text-xs text-walnut/60">Try switching to list view.</p>
          </div>
        </div>
      )}
    </div>
  );
}
