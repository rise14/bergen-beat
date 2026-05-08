"use client";

import { useState } from "react";

const NAV_LINKS = [
  { href: "/events",        label: "Events" },
  { href: "/venues",        label: "Venues" },
  { href: "/neighborhoods", label: "Neighborhoods" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-navy-800">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        {/* Logo — inverted to white for dark background */}
        <a href="/" className="flex items-center">
          <img
            src="/bergen-beat-logo.png"
            alt="Bergen Beat"
            className="h-8 w-auto brightness-0 invert"
          />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sky hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/submit"
            className="rounded-full bg-accent-orange px-4 py-1.5 font-semibold text-white hover:bg-walnut transition-colors"
          >
            Submit an Event
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="md:hidden flex flex-col justify-center gap-1.5 p-2 text-sky"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`block h-0.5 w-6 bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-navy-700 bg-navy-900 px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-sky hover:bg-navy-800 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/submit"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-accent-orange px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-walnut transition-colors"
            >
              Submit an Event
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
