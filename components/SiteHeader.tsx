"use client";

import { useState } from "react";

const NAV_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/categories", label: "Categories" },
  { href: "/neighborhoods", label: "Neighborhoods" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center">
          <img
            src="/bergen-beat-logo.png"
            alt="Bergen Beat"
            className="h-8 w-auto"
          />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-brand-600">
              {link.label}
            </a>
          ))}
          <a
            href="/submit"
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-white hover:bg-brand-700"
          >
            Submit an Event
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="md:hidden flex flex-col justify-center gap-1.5 p-2 text-gray-600"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span
            className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${
              open ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-current transition-opacity duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${
              open ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-600"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/submit"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
            >
              Submit an Event
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
