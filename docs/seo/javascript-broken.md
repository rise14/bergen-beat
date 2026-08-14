# Ahrefs Site Audit — "JavaScript broken"

- **Issue id**: `c64dab77-d0f4-11e7-8ed1-001e67ed4656`
- **Level**: Critical · **Category**: JavaScript
- **Project**: Ahrefs Site Audit `10017781` (target `www.bergenbeat.net`)
- **Triaged**: 2026-08-14

## TL;DR for future sessions

**False positive. There is no source-code fix, and no code change was made.**

All 8 flagged resources are Next.js content-hashed build chunks under `/_next/static/chunks/`
belonging to **superseded deployments**. Ahrefs crawled the HTML during one deploy generation,
then fetched the chunk URLs after Vercel had rotated to a newer build — immutable assets from
the old build are not retained, so they answer 404. The chunks the live pages reference *today*
all return 200 (verified below).

Re-crawl and this issue clears itself. Do **not** attempt to "fix" it — see "Do not touch".

## What Ahrefs flagged

8 resources, 110 broken references, 53 distinct source pages. Every flagged target is
HTTP 404, internal, `link_type = Script`. Every *source* page returned HTTP 200.

| Chunk (under `/_next/static/chunks/`) | JS inlinks | PR |
|---|---|---|
| `main-app-7577064e421cadfa.js` | 44 | 1 |
| `4618-b39d275585d58a08.js` | 44 | 1 |
| `main-app-28ec84f59124a955.js` | 9 | 0 |
| `4618-94ac8c3e25792fe6.js` | 9 | 0 |
| `app/events/today/page-3be72de0847374ed.js` | 1 | 0 |
| `app/events/this-week/page-ffb352de2055c048.js` | 1 | 0 |
| `app/events/free/page-bef95c37dc39bec9.js` | 1 | 0 |
| `app/this-weekend/page-366f4dcb9779406f.js` | 1 | 0 |

Source pages by section: `/events/*` 44, plus one each for `/` (home), `/this-weekend`,
`/towns`, `/venues`, `/categories`, `/neighborhoods`, `/newsletter`, `/submit`, `/sponsor`.

## How we know it's a crawl-vs-deploy race

Three independent signals, any one of which is sufficient:

1. **Nothing in the repo references these paths.** `grep -rn "_next/static"` across the whole
   tree returns **zero hits**. These filenames are emitted by the Next.js build with a content
   hash; they are never authored. So there is no template, layout, or component holding a stale
   `<script src>` — the usual cause of this issue does not apply here.
2. **Two build generations appear side by side.** `main-app-7577064e…` (44 refs) and
   `main-app-28ec84f5…` (9 refs) are the *same logical chunk* from two different deploys; ditto
   `4618-b39d2755…` / `4618-94ac8c3e…`. A real broken-asset bug produces one bad path, not two
   hashes of the same file. The 44/9 split is the bulk of one build plus the tail of the previous.
3. **The four single-ref page chunks are all `dynamic = "force-dynamic"` routes**
   (`/events/today`, `/events/this-week`, `/events/free`, `/this-weekend`). They re-render per
   request, so they are the first pages to hand out a fresh chunk hash mid-deploy — exactly the
   footprint you'd expect from a deploy landing during a crawl.

Mechanism: `/_next/static/*` is immutable and content-addressed. On each deploy Vercel publishes
a new hash set and stops serving the previous one. Any crawler whose run spans a deploy will
fetch HTML from build N and assets from build N+1, and report the build-N chunks as 404.

## Verified against the live site (curl, 2026-08-14)

Chunks currently referenced by `/events/free` — **all 200**:

```
200 /_next/static/chunks/2972-7a6073633f3d8dbc.js
200 /_next/static/chunks/4618-da3ae4fec21ecac3.js
200 /_next/static/chunks/5878-6c438970b732d693.js
200 /_next/static/chunks/app/error-70929774abe3757a.js
200 /_next/static/chunks/app/events/free/page-0b0d8b603172384a.js
200 /_next/static/chunks/app/global-error-63400f594c4946fc.js
200 /_next/static/chunks/app/layout-ad55cfe95d721980.js
200 /_next/static/chunks/fd9d1056-6fcd41b01ba7f759.js
200 /_next/static/chunks/main-app-af53d0df59e54e95.js
200 /_next/static/chunks/polyfills-42372ed130431b0a.js
200 /_next/static/chunks/webpack-55ba946cb3a7f445.js
```

All 8 chunks Ahrefs flagged — **all still 404** (expected; those builds are gone):

```
404 main-app-28ec84f59124a955.js      404 4618-94ac8c3e25792fe6.js
404 main-app-7577064e421cadfa.js      404 4618-b39d275585d58a08.js
404 app/events/free/page-bef95c37dc39bec9.js
404 app/events/today/page-3be72de0847374ed.js
404 app/events/this-week/page-ffb352de2055c048.js
404 app/this-weekend/page-366f4dcb9779406f.js
```

Note the hash rotation across all three tiers: `main-app` is now `af53d0df…` (not `7577064e…`
or `28ec84f5…`), shared chunk `4618` is now `da3ae4fe…`, and `app/events/free/page` is now
`0b0d8b60…`. Live documents and live assets agree; only Ahrefs' stale pairing does not.
`/events/today` and `/this-weekend` were spot-checked with the same result.

## Recognising this next time

A "JavaScript broken" / "CSS broken" report on this site is a false positive when **all** of:

- every flagged path sits under `/_next/static/`, and
- the same logical chunk appears under two or more hashes, and
- the chunks the live HTML references now return 200.

If instead a flagged path is one you can find in the repo (e.g. something under `public/`, or a
third-party `<script src>` in `app/layout.tsx`), that **is** real — fix the reference.

Also real, and worth ruling out before dismissing: if HTML is cached *longer* than its assets
survive, real users hit the same 404s the crawler did. That would show up as 404s on chunks the
**current** HTML references — not the case here (all 200 above). The site sets no custom
`Cache-Control` on documents; only HSTS is set in `next.config.js` `headers()`.

## Do not touch

- **Do not hand-edit `/_next/static/…` URLs anywhere.** They are build output. Pinning or
  rewriting a hash breaks the build and the runtime.
- **Do not add `Cache-Control` headers for `/_next/static/*`.** Vercel already serves those
  `immutable` with a correct long max-age; overriding it risks serving stale chunks for real.
- **Do not deactivate the issue in Ahrefs.** It's a genuine detector and would hide a real
  broken third-party script later. Just re-crawl.

## Recommended operational change

Schedule the Site Audit crawl in a window when deploys don't land (Ahrefs → project →
Site Audit → Settings → Schedule). Deploys here are triggered by merges to `main` plus the
five `vercel.json` crons (12:00, 16:00, 17:00, 12:00, 02:00 UTC — see `vercel.json`); the crons
call `revalidatePath()` rather than redeploying, so the practical conflict is merge traffic.
A crawl started well clear of a merge will not see two build generations.

If this recurs on every crawl regardless of timing, that suggests deploys during *every* crawl
window rather than a one-off — reconsider crawl frequency before touching code.
