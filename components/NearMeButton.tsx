"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DEFAULT_RADIUS_MILES } from "@/lib/geo";

interface Props {
  active: boolean;  // true when lat/lng are already in the URL
}

export function NearMeButton({ active }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearNearMe() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lat");
    params.delete("lng");
    params.delete("radius");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function activate() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", pos.coords.latitude.toFixed(5));
        params.set("lng", pos.coords.longitude.toFixed(5));
        params.set("radius", String(DEFAULT_RADIUS_MILES));
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied.");
        } else {
          setError("Couldn't get location.");
        }
      },
      { timeout: 8000 }
    );
  }

  if (active) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
          </svg>
          Within {DEFAULT_RADIUS_MILES} miles
        </span>
        <button
          onClick={clearNearMe}
          className="rounded-full border border-gray-200 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          aria-label="Clear near me filter"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={activate}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Locating…
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
            </svg>
            Near me
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
