"use client";

import { useState } from "react";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/events",        label: "Events" },
  { href: "/this-weekend",  label: "This Weekend" },
  { href: "/categories",    label: "Categories" },
  { href: "/neighborhoods", label: "Neighborhoods" },
];

export function SiteHeader() {
  const [open,        setOpen]        = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  }

  return (
    <header className="bg-navy-800">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex shrink-0 items-center">
          <Image
            src="/bergen-beat-logo.png"
            alt="Bergen Beat"
            width={79}
            height={32}
            priority
            className="h-8 w-auto brightness-0 invert"
          />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}
              className="text-sky hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop search + CTA */}
        <div className="hidden md:flex items-center gap-3">
          {/* Inline search bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events…"
              className="w-44 rounded-full border border-navy-700 bg-navy-900 py-1.5 pl-8 pr-3 text-sm text-sky placeholder-sky/50 outline-none transition focus:w-56 focus:border-sky focus:bg-navy-800 focus:text-white"
            />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sky/60 text-xs">🔍</span>
          </form>
          <a href="/submit"
            className="rounded-full bg-accent-orange px-4 py-1.5 font-semibold text-white hover:bg-walnut transition-colors text-sm">
            Submit an Event
          </a>
        </div>

        {/* Mobile: search icon + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={() => setSearchOpen((p) => !p)}
            className="p-2 text-sky"
            aria-label="Search"
          >
            🔍
          </button>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="flex flex-col justify-center gap-1.5 p-2 text-sky"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-6 bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="md:hidden border-t border-navy-700 bg-navy-900 px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              autoFocus
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events and venues…"
              className="w-full rounded-full border border-navy-700 bg-navy-800 py-2.5 pl-9 pr-4 text-sm text-white placeholder-sky/50 outline-none focus:border-sky"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sky/60 text-sm">🔍</span>
          </form>
        </div>
      )}

      {/* Mobile nav dropdown */}
      {open && (
        <div className="md:hidden border-t border-navy-700 bg-navy-900 px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-3">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-sky hover:bg-navy-800 hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
            <a href="/submit" onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-accent-orange px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-walnut transition-colors">
              Submit an Event
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
