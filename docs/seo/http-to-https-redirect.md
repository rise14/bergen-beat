# Ahrefs Site Audit — "HTTP to HTTPS redirect"

- **Issue id**: `c64d5080-d0f4-11e7-8ed1-001e67ed4656`
- **Level**: Notice · **Category**: Redirects
- **Project**: Ahrefs Site Audit `10017781` (target `www.bergenbeat.net`)
- **Crawl analysed**: 2026-08-13 04:39Z — health score 99.8, 545 pages crawled, 0 broken

## What Ahrefs flagged

Exactly **two** URLs, both returning 308:

| URL | Code | Redirect chain | Inlinks | Organic traffic |
|---|---|---|---|---|
| `http://bergenbeat.net/` | 308 | `https://bergenbeat.net/` → `https://www.bergenbeat.net/` | 0 | 0 |
| `http://www.bergenbeat.net/` | 308 | `https://www.bergenbeat.net/` | 0 | 0 |

The issue's companion **"Links to HTTP redirect"** report returned **zero rows**: no page on the
site links to an `http://` URL. Confirmed against source — `grep -rn "http://"` across the repo
matches only `xmlns:media="http://search.yahoo.com/mrss/"` in `app/feed.xml/route.ts`, which is an
XML namespace identifier, not a link, and must not be changed.

Both flagged rows are therefore **Ahrefs' own crawl seed URLs**, entered on the http scheme. An
HTTP entry point must answer with a redirect, so **this Notice cannot reach zero** and no
page-level or template-level link fix exists.

## Live behaviour before the fix (curl, 2026-08-13)

```
http://bergenbeat.net/       308 → https://bergenbeat.net/          (Cloudflare)
https://bergenbeat.net/      307 → https://www.bergenbeat.net/      (Vercel)
http://www.bergenbeat.net/   308 → https://www.bergenbeat.net/      (Cloudflare)
https://www.bergenbeat.net/  200 · Strict-Transport-Security: max-age=63072000
```

Two real problems, neither of which is a page-content bug:

1. **Apex requests cost two hops.** `http://bergenbeat.net/x` → `https://bergenbeat.net/x` →
   `https://www.bergenbeat.net/x`.
2. **The apex→www hop is a 307 (temporary)**, even though `next.config.js` declares
   `permanent: true` — Vercel serves that hop itself before the framework redirect resolves. A
   temporary redirect does not consolidate ranking signals the way a 301 does.

## Fix 1 (P1) — Cloudflare Redirect Rule · **manual, do this in the dashboard**

Collapses the apex chain to a single hop and makes it permanent, in front of Vercel.

**Cloudflare dashboard → `bergenbeat.net` → Rules → Redirect Rules → Create rule**

| Field | Value |
|---|---|
| Rule name | `apex to www (301, single hop)` |
| When incoming requests match | **Custom filter expression** |
| Expression | `http.host eq "bergenbeat.net"` |
| Then | **Dynamic** redirect |
| URL expression | `concat("https://www.bergenbeat.net", http.request.uri.path)` |
| Query string | **Preserve query string** — enabled |
| Status code | **301** (Permanent Redirect) |
| Preserve fragment | n/a (fragments are never sent to the server) |

Equivalent expression as a single line, if you prefer the expression editor:

```
(http.host eq "bergenbeat.net")
```

Notes:

- Match on `http.host` only — do **not** add a scheme condition. The rule must fire for both
  `http://` and `https://` apex requests; that is what removes the second hop.
- Do **not** create a matching `www → apex` rule. Combined with this rule (or with the
  `next.config.js` backstop) it produces an infinite redirect loop.
- Keep the `redirects()` block in `next.config.js`. It is the origin-level backstop for
  direct-to-Vercel traffic (preview URLs, Cloudflare proxy paused) and it is not redundant.
- Requires the apex `bergenbeat.net` DNS record to be **proxied** (orange cloud) for the edge rule
  to run.

**Expected result after applying:**

```
http://bergenbeat.net/x  →  301  →  https://www.bergenbeat.net/x   (one hop)
```

## Fix 2 (P2) — HSTS `includeSubDomains; preload` · in this PR

`next.config.js` now sends:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Previously only `max-age=63072000` was present (set upstream). With `preload`, browsers never
issue the initial HTTP request at all, which is the only way the http→https hop disappears for
real users rather than merely getting shorter.

**Shipping the header is safe and reversible.** The irreversible part is the separate, optional
submission to <https://hstspreload.org>. Before submitting:

- [ ] Every current subdomain of `bergenbeat.net` serves valid HTTPS (`includeSubDomains` has no
      per-host exemption — an HTTP-only staging box or mail panel becomes unreachable).
- [ ] Any future subdomain will also be HTTPS-only.
- [ ] Team accepts that removal from the preload list takes months, tied to browser releases.

If any box is unchecked, ship the header as-is and skip the submission — you still get HSTS for
every returning visitor.

## Fix 3 (P3) — Regression guard · in this PR

An explanatory comment block on the `redirects()` rule in `next.config.js` recording that the apex
rule is superseded at the edge, that it is deliberately kept as a backstop, and that the canonical
host lives in three places that must change together: this rule, the Cloudflare Redirect Rule, and
`normalizeSiteUrl()` in `lib/seo.ts`.

## Verification checklist

After deploying this PR **and** applying the Cloudflare rule:

```bash
curl -sI http://bergenbeat.net/            # expect: 301 → https://www.bergenbeat.net/
curl -sI http://bergenbeat.net/events      # expect: 301 → https://www.bergenbeat.net/events
curl -sI https://bergenbeat.net/           # expect: 301 → https://www.bergenbeat.net/
curl -sI http://www.bergenbeat.net/        # expect: 308 → https://www.bergenbeat.net/
curl -sI https://www.bergenbeat.net/       # expect: 200 + max-age=63072000; includeSubDomains; preload
curl -sIL http://bergenbeat.net/events -o /dev/null -w '%{num_redirects} hops\n'   # expect: 1
```

Then trigger a fresh Site Audit crawl. **The Notice will still list those two seed URLs** — that is
correct and expected behaviour, not a failed fix. What should change is the chain length and the
307 becoming a 301.
