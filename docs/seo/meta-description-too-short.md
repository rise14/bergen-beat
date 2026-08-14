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

---

## Recurrence: 16 `/events/` pages, crawl 2026-08-14 03:50 UTC

Ahrefs re-flagged the same issue name after the fix above shipped — 13 pages on the
non-indexable variant (`8d785026-001c-11e8-aa34-001e67ed4656`, Notice) and 3 on the
indexable one (`c64d5156-…`, Warning). **Different root cause, same symptom.** The venue
and category generators were fine; this was the `/events/` template.

Verified live before changing code (`curl | grep '<meta name="description"'`) — real, not a
stale crawl. All 16 sat at **98-99 characters**, i.e. 11 under the 110 floor.

### Root cause: the ladder knew the ceiling but not the floor

`buildEventDescription`'s clause-shedding ladder had only three rungs and returned the
**first candidate under `DESCRIPTION_MAX`**. For a typical Broadway listing:

| Rung | Length | Outcome |
|---|---|---|
| lead + date + price + full boilerplate | **156-157** | rejected, 1-2 over the 155 ceiling |
| lead + date + price | **98-99** | accepted — **11 under the 110 floor** |

There was no rung between 157 and 98. A one-to-two character overflow cost the entire
57-char boilerplate clause and dropped the description off a cliff. The `DESCRIPTION_MIN`
constant existed but only `padToMinimum` consulted it, and `padToMinimum` never ran on
these pages (see below), so nothing caught the result.

**Fix**: a fourth rung — `DESCRIPTION_BOILERPLATE_COMPACT` ("Event details and directions on
Bergen Beat.", 44 chars, 13 shorter). Narrow overflows now degrade to ~143 instead of 98.
No new facts, no filler: the compact string is the same claim in fewer words.

### Why `padToMinimum` didn't save these pages

Easy to assume the floor guard was already covering this. It wasn't — it only runs on the
`short_description` / `description` branches of `resolveEventDescription`. These 16 rows
have **NULL in both columns**, so they hit the third branch, which returns
`buildEventDescription(event)` raw. `save.ts` backfills `short_description` at *import*
time, so rows imported before PR #16 were never backfilled and still land there.

Two consequences worth remembering:

- The composed fallback branch has no post-hoc floor guard by design — the composed sentence
  *is* the description, so there's nothing to extend. Its length depends entirely on the
  ladder, which is why the fix belongs in the ladder.
- A backfill of pre-#16 rows would move these pages onto the `short_description` branch. The
  ladder fix makes them compliant either way, so a backfill is optional, not required.

### Verification

- All 16 flagged URLs reconstructed from the crawl → **110-160, no exceptions** (143-144).
- Swept 864 combinations (12 titles × 9 venue/city shapes × 4 dates × free/paid): **0 under
  110, 0 over 155**.
- Prior-fix regressions all still pass: the two fine-print feed cases (140 / 124), a 200-char
  blurb still clamped to 155, long titles keep their date, `Invalid Date` never emitted, the
  venue/city stutter guard intact, and the importer's `maxLength` budget still respected.
- `tsc --noEmit` could NOT be run (no network for `npm install` in this environment). The only
  signature change is the private `assemble(withPrice, boilerplate: string | null)` helper,
  with all four call sites updated in the same edit. **Run `npm run typecheck` in CI.**

### Known residual (deliberate)

Descriptions still land under 110 when an event has **no venue** AND a very short title
(`"Gala"` → 90 chars). No such row is in the flagged set. Clearing it would require inventing
facts, so it stays best-effort — same stance as the synthetic edge cases above.

### Do not

- **Don't lower `DESCRIPTION_MIN` or raise `DESCRIPTION_MAX`** to make the ranges meet. The
  ladder is the fix; the thresholds are Ahrefs' and Google's.
- **Don't pad with filler adjectives** to clear the floor. Every clause is a real column.
- **Don't add a rung by trimming the date or venue** — those are the only things making these
  near-identical Broadway listings distinct from each other.
