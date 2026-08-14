# Ahrefs Site Audit — "3XX redirect"

- **Issue id**: `c64d12c1-d0f4-11e7-8ed1-001e67ed4656`
- **Level**: Warning · **Category**: Redirects
- **Project**: Ahrefs Site Audit `10017781` (target `www.bergenbeat.net`)
- **Triaged**: 2026-08-14

## TL;DR for future sessions

There is **no source-code fix for this issue**. The three flagged rows are host-normalisation
entry points on the non-canonical host, and the companion "Links to 3XX redirect" report is
**empty** — no page on the site links to a redirecting internal URL. The warning cannot reach
zero. Do not "fix" it by editing the `redirects()` block in `next.config.js` or the iCal
`PRODID` string (see "Do not touch" below).

The one change that genuinely improves things is a **Cloudflare Redirect Rule**, which is
infrastructure, not code — same dependency as the already-merged
[`http-to-https-redirect.md`](./http-to-https-redirect.md) (issue `c64d5080-…`).

## What Ahrefs flagged

Exactly **three** URLs, all PR 0, all 0 organic traffic:

| URL | Code | Redirect chain | Inlinks | Redirect inlinks |
|---|---|---|---|---|
| `http://bergenbeat.net/` | 308 | `https://bergenbeat.net/` → `https://www.bergenbeat.net/` | 0 | 0 |
| `https://bergenbeat.net/` | 307 | `https://www.bergenbeat.net/` | 1 | 1 |
| `http://www.bergenbeat.net/` | 308 | `https://www.bergenbeat.net/` | 0 | 0 |

The issue's **"Links to 3XX redirect"** report (`links` dataset, filter
`3a018cfa6b496ef2d4504242bc1f27e0`) returned **zero rows**.

Ahrefs' own guidance for this issue is *"replace the links to the internal redirected URLs with
direct links to the destination pages"*. With zero such links, that instruction has no target.
The rows are Ahrefs' crawl seed URLs, entered on the apex / http scheme; an entry point on a
non-canonical host **must** answer with a redirect.

## Verified against the live site (curl, 2026-08-14)

```
http://bergenbeat.net/          308 → https://bergenbeat.net/       (Cloudflare)
https://bergenbeat.net/         307 → https://www.bergenbeat.net/   (Vercel)
http://www.bergenbeat.net/      308 → https://www.bergenbeat.net/   (Cloudflare)
https://www.bergenbeat.net/     200
https://bergenbeat.net/events   307 → https://www.bergenbeat.net/events
```

Also confirmed clean:

- `sitemap.xml` — 140 URLs, **all** on `https://www.bergenbeat.net`. No apex, no http.
- `normalizeSiteUrl()` in `lib/seo.ts` already upgrades an apex `NEXT_PUBLIC_SITE_URL` to
  `https://www.`, so the misconfiguration that once put 52 redirecting URLs in the sitemap is
  guarded at the source.
- No absolute apex or `http://` internal links anywhere in `app/`, `components/`, `lib/`.

## The two real (non-code) problems

1. **Apex requests cost two hops.** `http://bergenbeat.net/x` → `https://bergenbeat.net/x` →
   `https://www.bergenbeat.net/x`.
2. **The apex→www hop is a 307 (temporary)** even though `next.config.js` declares
   `permanent: true` — Vercel serves that hop itself before the framework redirect resolves.
   A 307 does not consolidate ranking signals the way a 301 does.

Both are fixed by one edge rule, still **not applied** as of this triage.

## Fix (P1) — Cloudflare Redirect Rule · manual, dashboard or API

This step is **dashboard-only in this workspace**: the available Cloudflare connectors cover DNS
records, zones and registrar — there is no Rulesets/Redirect-Rules connector, so the rule cannot
be created through the API from here.

**Cloudflare dashboard → `bergenbeat.net` → Rules → Redirect Rules → Create rule**

| Field | Value |
|---|---|
| Rule name | `apex to www (301, single hop)` |
| Match | Custom filter expression: `http.host eq "bergenbeat.net"` |
| Then | **Dynamic** redirect |
| URL expression | `concat("https://www.bergenbeat.net", http.request.uri.path)` |
| Query string | **Preserve query string** — enabled |
| Status code | **301** |

- Match on `http.host` only — **no scheme condition**. The rule must fire for both `http://` and
  `https://` apex requests; that is what removes the second hop.
- Requires the apex `bergenbeat.net` DNS record to be **proxied** (orange cloud).
  **Verified 2026-08-14 via the Cloudflare API**: zone `bergenbeat.net`
  (`86768cc3180eebe5a8e05521c7532ae2`, status `active`, not paused) has apex
  `A 76.76.21.21` with `proxied: true`. The prerequisite is already met — the rule will run
  as soon as it is created. No DNS change is needed.
- Do **not** add a matching `www → apex` rule. Combined with this rule or with the
  `next.config.js` backstop it is an infinite redirect loop.

## Do not touch

- **`next.config.js` `redirects()` block** — keep it. It is the origin-level backstop for
  direct-to-Vercel traffic (preview deployments, paused Cloudflare proxy). Not redundant with
  the edge rule.
- **`app/api/events/[slug]/ical/route.ts`** — `PRODID:-//Bergen Beat//bergenbeat.net//EN` is an
  iCalendar product identifier, not a link. It is the only apex-host string in the codebase and
  changing it breaks calendar client dedup.
- The canonical host lives in **three** places that must change together: the `redirects()` rule,
  the Cloudflare Redirect Rule, and `normalizeSiteUrl()` in `lib/seo.ts`.

## Verification, after the Cloudflare rule is applied

```bash
curl -sI  http://bergenbeat.net/         # expect 301 → https://www.bergenbeat.net/
curl -sI  https://bergenbeat.net/        # expect 301 → https://www.bergenbeat.net/
curl -sI  https://bergenbeat.net/events  # expect 301 → https://www.bergenbeat.net/events
curl -sI  https://www.bergenbeat.net/    # expect 200
curl -sIL http://bergenbeat.net/events -o /dev/null -w '%{num_redirects} hops\n'   # expect 1
```

Then trigger a fresh Site Audit crawl. **The three seed URLs will still be listed** — that is
correct, not a failed fix. What should change: chain length 2 → 1, and the 307 becoming a 301.
