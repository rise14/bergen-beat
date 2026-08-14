# Ahrefs Site Audit — "Meta description too long"

- **Issue id**: `c64d56c9-d0f4-11e7-8ed1-001e67ed4656`
- **Level**: Warning · **Category**: HtmlTags
- **Project**: Ahrefs Site Audit `10017781` (target `www.bergenbeat.net`)
- **Triaged / fixed**: 2026-08-14

## TL;DR for future sessions

Ahrefs' filter is `isValidInternalHtml AND metaDescriptionLength > 160 AND compliant`.
Target range is 110–160, so this issue and its sister
[`meta-description-too-short.md`](./meta-description-too-short.md) squeeze from opposite
sides — **any change here must be checked against the 110 floor too**, or you just trade one
warning for the other. (The first draft of the towns ladder below did exactly that: it fixed
the 164-char page and pushed three short town names to 107–109.)

Nine pages, two unrelated causes, both in generators — no per-page copy was involved.

## The affected set

All 9: `compliant=true`, `httpCode=200`, `nrMetaDescription=1`, **0 organic traffic**
(so prioritisation used `pageRating`, 20–22 across the board).

| Group | Pages | Length before | Cause | Fix |
|---|---|---|---|---|
| `/events/<slug>` | 8 | 196–200 | unclamped feed blurb | `clampToMax()` in `resolveEventDescription()` |
| `/towns/other` | 1 | 164 | town name printed twice | `buildTownDescription()` |

## Cause 1 — `/events/`: the importers' 200-char slice reached the meta tag

Every importer stores its blurb truncated to **200** characters:
`lib/importers/ticketmaster.ts:150`, `predicthq.ts:99`, `ical.ts:232`, `rss.ts:304` — all
`.slice(0, 200)`. `resolveEventDescription` was asymmetric between its two branches:

```ts
const short = event.short_description?.trim();
if (short) return padToMinimum(short, event);                            // ← NOT clamped

const long = event.description?.trim();
if (long) return padToMinimum(long.slice(0, DESCRIPTION_MAX), event);    // ← clamped
```

`padToMinimum` only ever *appends* (that's its job for the "too short" issue), so a blurb
already over the 110 floor came back untouched. Every feed blurb landing in **161–200** chars
therefore shipped as-is. That's the 8 pages exactly — and it's why the flagged tags read like
mid-word cuts (`…Rather than adapting the entire Toldi trilogy, Marcell Ja`): that *is* the
importer's 200-char slice, surfaced verbatim.

**Don't fix this in the importers.** `short_description` is also rendered by the newsletter
templates (`lib/email.ts`), where 200 characters is desirable. Only the meta tag has a 160
ceiling, so the clamp belongs in `lib/seo.ts`.

`clampToMax()` backs up to the last word boundary, strips trailing punctuation (so we never
emit `",…"`), and appends `…`. Both branches now call it — the `description` branch's old
`.slice()` was a hard cut that could still land mid-word. Text already ≤155 is returned
identical; it never pads, rewords, or invents.

## Cause 2 — `/towns/other`: the town name was in the string twice

`app/towns/[slug]/page.tsx` built the description inline:

```ts
`Find things to do in ${town}, NJ — upcoming concerts, festivals, family events,
 outdoor activities, and more. ${n} events coming up in ${town}.`
```

`Teaneck` → 141 ✅, but `Other Bergen County` → **164** ❌. So it wasn't specific to that
row: **any town name of ~16+ characters overflowed.** PR #17 gave `/venues` and
`/categories` the `firstFitting()` ladder; towns was the one listing generator still inline
and unguarded.

`buildTownDescription()` sheds the redundant trailing town repeat first, then the "outdoor
activities" clause. The count clause is the live `upcomingCount` and is **dropped, never
printed as "0 events"** — which is why the zero case needs its own tail: `"Maywood"` with no
tail is only 109 chars, under the floor. At `count = 0` a browse clause carries the length
instead.

## Verification

- `npx tsc --noEmit` — clean.
- `buildTownDescription` over every town name currently in the database × counts
  `0/1/2/5/12/137` — **132 combinations, range 135–160, 0 outside 110–160.**
- `resolveEventDescription` on the 8 flagged pages' real crawled `short_description` values —
  all land **150–154**, none end in dangling punctuation, all mark the elision.
- **Regression check against the sister issue**: the two pages fixed by
  `meta-description-too-short` (48- and 77-char promoter fine-print) still pad to 126 and 154.
  The no-blurb fallback still composes 142. Re-run this whenever either issue is touched.

## Do not touch

- **Don't lower `DESCRIPTION_MAX` (155) toward 160.** The 5-char headroom is what lets
  `padToMinimum` append without overflowing.
- **Don't change the importers' `.slice(0, 200)`** — the newsletter renders that column.
- **Don't reorder `resolveEventDescription`'s precedence.** Feed/human copy stays ahead of the
  composed fallback; clamping happens *after* selection, so hand-written copy is still honoured.
- **Don't hand-write per-event or per-town descriptions.** Importers run on cron and would
  overwrite event copy the next day; the town generator covers the whole set.
- **Don't print a `0 events` count clause** to simplify the towns zero case.

## Known remaining risk (not flagged in this crawl)

`app/neighborhoods/[slug]/page.tsx:28` has the same unguarded inline pattern:

```ts
`Find ${n} upcoming event${…} in ${locationStr}. Concerts, markets, festivals, food events
 and more in Bergen County.`
```

It's under 160 for current data, so Ahrefs didn't flag it, and it was left alone to keep this
change scoped. It will overflow on a long `locationStr` — convert it to a `firstFitting()`
ladder when it does (or proactively, alongside the next Content issue).
