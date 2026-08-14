# Ahrefs Site Audit — "Title too long"

- **Issue id**: `c64dac3a-d0f4-11e7-8ed1-001e67ed4656`
- **Level**: Warning · **Category**: HtmlTags
- **Project**: Ahrefs Site Audit `10017781` (target `www.bergenbeat.net`)
- **Triaged / fixed**: 2026-08-14

## TL;DR for future sessions

Ahrefs' filter is `isValidInternalHtml AND titlesLength > 70 AND compliant`.

**The number Ahrefs measures includes the suffix `app/layout.tsx` appends.** The root
layout sets `title: { template: "%s | Bergen Beat" }`, so every child route's
`Metadata.title` is a *page-specific part*, not the finished tag, and it carries a
**14-character** tax. The real budget for anything a page sets is therefore
**56 characters** — `TITLE_PART_MAX` in `lib/seo.ts`.

That 14-char gap is the whole issue: one flagged page was only 71 chars, i.e. a
57-character title part. Everything looked fine locally.

The sister issue [`Title too short`](https://app.ahrefs.com) is `titlesLength < 15`
(`c64d3bf4-d0f4-11e7-8ed1-001e67ed4656`, currently 0 pages). Unlike the meta-description
pair, these two do **not** squeeze from both sides in practice: the suffix alone is 14
chars, so a 1-character title part still clears the floor. Trimming titles can't trade
this warning for that one. It stays worth a thought if the suffix is ever shortened.

## Where title generation lives

| Route | Title source |
|---|---|
| `/events/<slug>` | `buildEventTitle()` — `lib/seo.ts` |
| `/venues/<slug>` | `buildVenueTitle()` — `lib/seo.ts` |
| `/this-weekend` | `buildWeekendTitle()` — `lib/seo.ts` |
| everything else | literal strings in each route's `metadata` / `generateMetadata` |

`firstFittingTitle()` is the title-side sibling of the descriptions' `firstFitting()`,
with one deliberate difference: when no rung fits it **clamps** the last one instead of
returning it overflowing. A title ladder's last rung is hand-written copy, so if even
that busts the budget, a word-boundary cut beats a fresh Ahrefs warning.

## Cause 1 — `/events/<slug>`: feed titles carry venue + town boilerplate

`title: event.title` passed importer strings through verbatim. Feed titles routinely
re-state the venue and town that the page's own H1, breadcrumb and JSON-LD already
carry:

```
Beginner Pickleball Clinics for Kids Ages 6-8 at Montclair Pickleball in Fair Lawn
                                             └────────── 26 redundant chars ──────┘
```

`buildEventTitle()` sheds a **trailing** ` in <city>` then ` at <venue>` (only at the
end — never mid-string, so `"Live at the Hermitage: Summer Series"` keeps its shape),
and only ellipsis-trims what's left. A naive clamp would have spent the budget on the
boilerplate and cut the distinguishing part (`Ages 6-8`).

Of the 37 non-indexable pages on this same code path, **27 are fixed by clause-shedding
alone** and only 10 need an ellipsis.

**Don't move this into the importers.** `event.title` is also the H1, the OG image
caption (`app/events/[slug]/opengraph-image.tsx`), the JSON-LD `name`, and the
newsletter subject lines (`lib/email.ts`) — the full feed string is correct in all of
them. Only `<title>` has a 70-char ceiling. (Same reasoning as the `short_description`
clamp for meta descriptions; see
[`meta-description-too-long.md`](./meta-description-too-long.md).)

## Cause 2 — `/venues/<slug>`: the city was in the string twice

The inline expression was:

```ts
const title = venue.city ? `${venue.name}, ${venue.city}` : venue.name;
```

Venue **names** in this DB often already end in their town, so that stuttered:

```
Williams Center - Cinema Underground - Rutherford, Rutherford | Bergen Beat   (75)
```

`buildVenueDescription()` has guarded against exactly this since the description work
(the `name.toLowerCase().includes(city.toLowerCase())` check) — the title just never
reused it. `buildVenueTitle()` now does, and sheds the city entirely before it would
trim the venue's actual name.

Any *new* place where name and city get concatenated should reuse one of these two
helpers rather than re-deriving the check.

## Cause 3 — `/this-weekend`: spelled-out dates made length calendar-dependent

The title interpolated the live range, weekday and long month spelled out twice:

```
This Weekend in Bergen County — Fri, August 14 – Sun, August 16 | Bergen Beat   (77)
```

Sweeping every weekend of the year, the finished tag ran **69–83 characters** — so this
page **drifted in and out of the issue depending on the current month's name**. If you
see a single listing page flapping between crawls, suspect an interpolated date.

Nobody searches the literal dates, so they now stay in the H1 / OG title / page copy
and the tag carries evergreen phrasing at a fixed 62 chars.

Note the ladder's first rung (`… — Events & Things to Do`) is 57 chars — **71 with the
suffix**, one character over. It's kept as the first rung on purpose: it documents the
intended copy and `firstFittingTitle` silently declines it, so edits here can't
reintroduce the warning. Today the 48-char rung wins.

## Verification performed

- `npx tsc --noEmit` clean.
- All 6 unique flagged indexable pages, using their **real crawled titles**: 96→59,
  71→62, 80→63, 89→64, 75→63, 77→62. All ≤70.
- All 37 non-indexable pages swept from crawled values: 0 still over 70.
- Regression: already-short titles returned byte-identical (`Wicked`,
  `Teaneck Farmers Market`, and the venue-name-equals-title case).
- Floor check: pathological 1-char inputs still finish ≥15 total.
- Degenerate input: a single 90-char word with no space clamps to exactly 70.

## Known non-issues / don't chase these

- **The 3 `jurassic-quest` URLs are the same event**, differing only by a slug suffix
  (`…-Zv9M5k`, `…-Zv9M56`, bare). That's a **duplicate-content** problem, not a title
  problem, and is deliberately untouched here. Fixing the dupes will make this issue's
  count drop by 2 on its own.
- **All 8 flagged pages had `traffic: 0`**, so this was hygiene, not a traffic rescue.
  Don't expect a ranking movement from it.
- `depth: 0` on every flagged row is a quirk of this crawl's data, not a sign these are
  all homepages.
