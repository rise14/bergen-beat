# Ahrefs Site Audit — "Meta description too short"

- **Issue id**: `c64d5156-d0f4-11e7-8ed1-001e67ed4656` (indexable variant, 53 pages)
- **Sister issue**: `8d785026-001c-11e8-aa34-001e67ed4656` (non-indexable variant, 61 pages, Notice) — same root cause, fixed by the same templates
- **Level**: Warning · **Category**: HtmlTags
- **Project**: Ahrefs Site Audit `10017781` (target `www.bergenbeat.net`)
- **Triaged / fixed**: 2026-08-14

## TL;DR for future sessions

Ahrefs warns below **110 characters** (target range 110–160). All 53 flagged pages were
template-generated, and the templates were **structurally incapable** of clearing the floor —
the longest venue name in the database still produced only 83 characters:

```ts
// app/venues/[slug]/page.tsx — before (52–83 chars)
`Upcoming events at ${venue.name} in ${venue.city}, Bergen County, NJ.`

// app/categories/[slug]/page.tsx — before (58–89 chars)
`Find the best ${category.name.toLowerCase()} events happening in Bergen County, NJ.`
```

So this was **not** a copywriting backlog. Fixing it per-page would have been 53 hand-written
strings papering over two one-line generators, re-broken the moment a venue or category is
added. The fix belongs in the generator.

**Do not raise `DESCRIPTION_MAX` or pad with filler to clear the floor.** Every clause added
below is a real column value.

## The affected set

| Group | Pages | Length before | Fix |
|---|---|---|---|
| `/venues/<slug>` | 38 | 52–83 | `buildVenueDescription()` |
| `/categories/<slug>` | 13 | 58–89 | `buildCategoryDescription()` |
| `/venues` (hub, PR 39) | 1 | 59 | static string |
| `/categories` (hub, PR 39) | 1 | 89 | static string |
| `/events/<slug>` | 2 | 48, 77 | `padToMinimum()` in `resolveEventDescription()` |

All 53 were `compliant=true` (indexable), `httpCode=200`, `nrMetaDescription=1` — the tags
existed and were unique, they were just short. Organic traffic was 0 on **all** 53, so
prioritisation used `pageRating`, not traffic.

## The `/events/` two are a different bug

Worth understanding, because it looks like a regression of the already-fixed
[`meta-description-missing.md`](./meta-description-missing.md) but isn't.

PR #16 guaranteed a description **exists**. These two pages have one — it's just the wrong
content, because the upstream feed put promoter fine-print in the blurb field:

| Page | `short_description` | Len |
|---|---|---|
| `/events/zedd-in-the-park-nyc-friday-ticket-2026-08-14` | `RAIN OR SHINE EVENT - ALL ACTS SUBJECT TO CHANGE` | 48 |
| `/events/dog-man-the-musical-2026-08-14` | `Tickets purchased in the Mezzanine VIP sections get access to the VIP Lounge.` | 77 |

Real feed content wins precedence (correctly — that rule is what keeps hand-written copy
safe), so `resolveEventDescription` returned it untouched and short. `padToMinimum()` now
**appends** the composed factual sentence when existing copy is under 110, preserving the
original verbatim at the front. It never discards feed content and never invents facts.

Two implementation traps, both hit during this fix:

1. **Compose into the remaining budget.** The first attempt appended a full-budget
   `buildEventDescription()` and then checked the total against `DESCRIPTION_MAX` — which
   always overflowed, so the guard silently returned the original and the fix was a no-op.
   `buildEventDescription()` now takes a `maxLength` so the suffix sheds its own clauses.
2. **Reject the ellipsis path.** `buildEventDescription()`'s last resort word-trims the title
   with `…`, which as a *suffix* reads badly mid-clause
   (`at Lena Horne Theatre in… on Friday`). `padToMinimum` detects that and falls back to
   `dateSuffix()` (date + venue name) instead.

## The fix

`lib/seo.ts` gains three exported helpers and one private one:

- **`buildVenueDescription(venue)`** — leads with the live `upcomingCount` ("6 upcoming events
  at …"), omits the count clause entirely when 0, and skips a redundant city when the venue
  name already contains it (venue "Teaneck Armory" in city "Teaneck" would otherwise stutter —
  same guard `buildEventDescription` uses).
- **`buildCategoryDescription(name)`** — adds a "browse by date, town and venue" clause.
- **`firstFitting(candidates)`** — shared clause-shedding ladder: the first candidate under 160
  wins, so a long venue or category name degrades gracefully instead of overflowing the
  ceiling. This is why the strings aren't hand-tuned: `Arts & Culture`,
  `Markets & Fairs` and `Sports & Fitness` all overflowed the first draft.
- **`padToMinimum(existing, event)`** — the `/events/` floor, described above.

The `/venues` and `/categories` hubs are static one-offs (no template involved), so they're
hand-written at the right length. `/categories` now names the actual categories instead of
trailing off at "and more".

## Verification

`npx tsc --noEmit` passes. Generated output was asserted in range across every venue/category
name currently in the database × `upcomingCount` of 0/1/2/12 — **112 combinations, 0 outside
110–160**. Re-run that check after adding a category or a venue with an unusually long name.

Two synthetic `/events/` edge cases (a 70-char title with 10 chars of fine-print, and an
unparseable `start_date`) still land under 110. That's deliberate: clearing the floor there
would require inventing facts. Best-effort with real columns only.

## Do not touch

- **Don't hand-write per-venue or per-category descriptions.** The generators cover the whole
  set; a one-off string is a future inconsistency.
- **Don't drop the `upcomingCount` clause** to simplify — it's what makes the venue
  descriptions distinct from each other, which is the other half of why short descriptions
  hurt (near-duplicate snippets).
- **Don't reorder `resolveEventDescription`'s precedence.** Feed/human copy must stay ahead of
  the composed fallback; `padToMinimum` only ever appends to it.
- **`/venues/united-states`** has a data-quality bug (a country value in the venue-name slot,
  producing "Upcoming events at United States"). The template fix makes it long enough but
  it's still nonsense copy — that's a `venues` row to clean up, not a code change.
