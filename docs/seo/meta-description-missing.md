# Ahrefs Site Audit — "Meta description tag missing or empty"

- **Issue id**: `57751310-001c-11e8-b746-001e67ed4656` (non-indexable variant, 213 pages)
- **Sister issue**: `c2374462d9d0ef63ad879d0f2dd819fc` (indexable variant, 31 pages) — same root cause, same fix
- **Level**: Warning · **Category**: HtmlTags
- **Project**: Ahrefs Site Audit `10017781` (target `www.bergenbeat.net`)
- **Triaged / fixed**: 2026-08-14

## TL;DR for future sessions

All 244 flagged URLs were `/events/<slug>` detail pages, and the cause was **one line of
code**, not a content backlog:

```ts
// app/events/[slug]/page.tsx — before
description: event.short_description ?? event.description?.slice(0, 155),
```

When both DB columns are NULL this evaluates to `undefined` and Next.js emits **no
`<meta name="description">` at all**. Fixed with a deterministic fallback
(`resolveEventDescription` in `lib/seo.ts`) plus an importer-side backfill.

**Do not "fix" this class of issue by hand-writing descriptions per event** — see below.

## Why the columns were NULL

The importers only populate a blurb when the upstream feed happens to carry one:

| Importer | Source field | Behaviour when absent |
|---|---|---|
| `lib/importers/ticketmaster.ts` | `tm.info` | `null` — Ticketmaster omits `info` for most Broadway / touring listings |
| `lib/importers/predicthq.ts` | `phq.description` | `null` |
| `lib/importers/ical.ts` | `raw.description` | `null` |
| `lib/importers/rss.ts` | feed description | `null` |

The imports run on cron (`app/api/cron/import/route.ts`), so **per-page copywriting is
self-defeating**: tomorrow's run re-creates the problem for the next batch of events. The
fix has to be a fallback in code.

## The fix

Three files, one shared helper:

1. **`lib/seo.ts`** — new `buildEventDescription()` composes a description from columns that
   always exist (title, `start_date`) plus whatever else is present (venue name, city,
   free/price). `resolveEventDescription()` wraps it with precedence:
   `short_description` → `description` (clamped) → composed sentence.
2. **`app/events/[slug]/page.tsx`** — `generateMetadata` calls `resolveEventDescription`, so
   `description` is never `undefined`. Same value is reused for `og:description`.
3. **`lib/importers/save.ts`** — backfills `short_description` at insert time, so the column
   is never NULL going forward. Applied centrally here rather than in each of the four
   importers: one code path, no divergence.

Example output (real production events, 88–155 chars):

```
Wicked at Gershwin Theatre in New York on Friday, August 14, 2026. Tickets $89–$250. Find event details, times, and directions on Bergen Beat.
MJ on Friday, August 14, 2026. Find event details, times, and directions on Bergen Beat.
```

### Invariants the helper maintains

- **Never invents facts.** Every clause is a real DB field; a missing field is omitted.
- **No stutter.** The venue and city clauses are skipped when the title already contains
  them — otherwise "Summer Friday Guided Tours at the Hermitage in Ho-Ho-Kus" gained a
  second "at the Hermitage in Ho-Ho-Kus", and "Teaneck Farmers Market" (whose venue row is
  also named "Teaneck") read "…Market at Teaneck in Teaneck".
- **Long titles shed clauses, not the date.** Over 155 chars the helper drops boilerplate,
  then price, and only then trims the title — clamping the assembled string used to cut
  mid-date ("… on Friday…"), destroying the one clause that makes each description unique.
- **Unparseable `start_date`** omits the date clause instead of emitting "Invalid Date".
- **Existing content always wins** — non-destructive by construction.

## Also fixed: Event JSON-LD description

`buildEventJsonLd` had `if (event.description) jsonLd.description = ...`, so the same NULL
columns left `"description": null` in the Event rich-result payload (verified live on
`/events/wicked-2026-08-14`). It now uses `resolveEventDescription` too.

## Do not touch

- **`isHiddenFromListings()` / the `noindex` behaviour.** 213 of the 244 pages are past
  events deliberately de-indexed (they stay published 7 days so existing links work). That
  is intentional and belongs to issues `c64d588b-…` / `f485750c-…`, not this one. A meta
  description on a `noindex` page is never shown by Google — those 213 were cosmetic, and
  they age out on their own.
- The `robots` / `alternates` blocks in `generateMetadata` — untouched by this fix.

## Verification

- `npx tsc --noEmit` — clean.
- Helper exercised directly via `tsx` against real production event shapes (Wicked,
  Teaneck Farmers Market, the Hermitage, MJ), including both precedence paths.
- Post-deploy: see the PR body for the re-check URL list and the re-crawl reminder.
