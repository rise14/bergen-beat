# Bergen Beat — Deployment Checklist

Everything you need to go from a fresh Vercel + Supabase project to a live bergenbeat.net.

---

## 1. Supabase Setup

### 1a. Run migrations (in order)

Open **Supabase → SQL Editor** and run each file in `supabase/migrations/` in the order listed below. All are idempotent — they use `IF NOT EXISTS` or `CREATE OR REPLACE`.

| Order | File | What it creates |
|-------|------|----------------|
| 1 | `supabase/schema.sql` | Core tables: events, venues, neighborhoods, categories, submissions, newsletter_subscribers, ical_sources, import_log |
| 2 | `add_venue_slugs.sql` | Adds `slug` column to venues + unique index |
| 3 | `venue_neighborhood_descriptions.sql` | Adds `description` + `hero_url` to venues and neighborhoods |
| 4 | `storage_event_images.sql` | Creates `event-images` Storage bucket + RLS policies |
| 5 | `newsletter_archive.sql` | Creates `newsletter_archive` table for past digest editions |
| 6 | `ical_sources.sql` | Creates `ical_sources` table for iCal feed management |

### 1b. Enable Storage

1. Go to **Supabase → Storage** and confirm the `event-images` bucket exists and is set to **Public**.
2. If it's missing, run `storage_event_images.sql` again.

### 1c. Enable Email Auth (for admin login)

1. **Supabase → Authentication → Providers → Email** — ensure it's enabled.
2. **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://www.bergenbeat.net`
   - Redirect URLs: `https://www.bergenbeat.net/**`

### 1d. Create your admin user

1. **Supabase → Authentication → Users → Add user** — enter your email and a strong password.
2. Your `ADMIN_EMAIL` env var must match this email exactly.

---

## 2. Environment Variables

Set all of these in **Vercel → Project → Settings → Environment Variables** (Production, Preview, and Development as appropriate).

### Required — will break without these

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project → Settings → API → service_role key ⚠️ never expose to browser |
| `NEXT_PUBLIC_SITE_URL` | `https://www.bergenbeat.net` (no trailing slash) |
| `ADMIN_EMAIL` | The email you registered as admin in Supabase Auth |
| `RESEND_API_KEY` | resend.com → API Keys |
| `CRON_SECRET` | Generate with `openssl rand -base64 32` — must match `vercel.json` header check |

### Required for event imports

| Variable | Where to get it |
|----------|----------------|
| `TICKETMASTER_API_KEY` | developer.ticketmaster.com → My Apps |
| `PREDICTHQ_ACCESS_TOKEN` | predicthq.com → API access → Access tokens |
| `EVENTBRITE_API_KEY` | eventbrite.com → Account → Developer Links → API Keys |
| `UNSPLASH_ACCESS_KEY` | unsplash.com/developers → Your apps → Access Key (used for fallback images on PredictHQ events) |

### Required for the map

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | mapbox.com → Tokens (public token, scope: `styles:read`, `tiles:read`) |

### Optional but strongly recommended

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 measurement ID (`G-XXXXXXXXXX`) — from analytics.google.com |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | From Google Search Console → Verify with meta tag |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser error tracking (see Section 5) |
| `SENTRY_DSN` | Server error tracking (same value as above) |
| `SENTRY_ORG` | Your Sentry org slug |
| `SENTRY_PROJECT` | Your Sentry project slug |
| `SENTRY_AUTH_TOKEN` | From Sentry → Settings → Auth Tokens — needed for source map uploads at build time |

---

## 3. Vercel Project Settings

### 3a. Framework & Build

- Framework Preset: **Next.js**
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (or `npm ci`)

**After adding Sentry** (Step 5): add `SENTRY_AUTH_TOKEN` to environment variables so source maps upload during `npm run build`.

### 3b. Cron jobs

`vercel.json` already defines four cron jobs. Crons require a **Vercel Pro plan** (or higher). Verify they appear in **Vercel → Project → Settings → Cron Jobs** after deploy.

| Cron | Schedule | What it does |
|------|----------|-------------|
| `POST /api/cron/import` | Daily at noon ET | Fetches new events from Ticketmaster, PredictHQ, Eventbrite, all enabled iCal sources |
| `POST /api/cron/expire` | Daily at 2am ET | Archives past events, revalidates cache |
| `POST /api/cron/newsletter` | Thursdays at noon ET | Sends weekly digest to confirmed subscribers |
| `POST /api/cron/weekend-digest` | Fridays at noon ET | Sends weekend picks digest |

Each cron passes `Authorization: Bearer $CRON_SECRET` — make sure that env var is set.

### 3c. Domain

1. **Vercel → Project → Settings → Domains**:
   - Add `www.bergenbeat.net` (primary)
   - Add `bergenbeat.net` (redirects to www — `next.config.js` handles the HTTP redirect)
2. Copy the Vercel DNS records (CNAME or A records) and add them to Cloudflare.
3. In **Cloudflare → DNS**: set the proxy status for the Vercel records to **DNS only** (grey cloud) — Vercel handles SSL termination.

---

## 4. Resend Email Setup

1. **resend.com → Domains → Add domain**: add `bergenbeat.net`.
2. Add the SPF, DKIM, and DMARC DNS records Resend provides — add them in Cloudflare.
3. Verify the domain in Resend (usually takes < 5 minutes after adding DNS records).
4. All transactional emails send from `Bergen Beat <hello@bergenbeat.net>` — confirm this address is allowed in your Resend account.
5. The newsletter `From` address and reply-to are set in `lib/email.ts` — update if you want a different sender name.

---

## 5. Sentry Error Tracking

Sentry config files have been created (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) and wired into `error.tsx` / `global-error.tsx`. One step remains — install the SDK:

```bash
npm install @sentry/nextjs
```

Then:

1. Create a new project at **sentry.io** → New Project → Next.js.
2. Copy the DSN from **Project Settings → Client Keys (DSN)**.
3. Add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` to Vercel env vars.
4. Redeploy — Sentry will begin capturing errors and uploading source maps.

---

## 6. Post-Deploy Checks

Run through these after your first successful deploy:

### Functional smoke tests

- [ ] Homepage loads with events
- [ ] `/events` page loads with filter pills
- [ ] Individual event page (`/events/[slug]`) loads correctly
- [ ] `/this-weekend` shows upcoming weekend events
- [ ] `/neighborhoods` and `/venues` list pages load
- [ ] `/search?q=test` returns results
- [ ] Newsletter subscribe form submits and sends confirmation email
- [ ] Unsubscribe link in email redirects to `/preferences?...&unsubscribed=1` with confirmation screen
- [ ] `/feed.xml` returns valid RSS

### Admin smoke tests

- [ ] `/admin` login works with your Supabase credentials
- [ ] `/admin/events` lists events; filter and search work
- [ ] Create a test event (status: draft), preview it at `/events/[slug]?preview=1`
- [ ] Publish the event — confirm it appears on homepage
- [ ] `/admin/import` — run an import manually; check results
- [ ] `/admin/subscribers` — send a test digest
- [ ] Upload a banner image on an event — confirm it appears in Supabase Storage
- [ ] Add an iCal source and import from it

### Cron test (after first deploy)

- [ ] Trigger `/api/cron/import` manually via Vercel's cron dashboard or `curl -H "Authorization: Bearer $CRON_SECRET" https://www.bergenbeat.net/api/cron/import`
- [ ] Check import log in Supabase for results

### SEO checks

- [ ] `https://www.bergenbeat.net/sitemap.xml` returns your events + static pages
- [ ] `https://www.bergenbeat.net/robots.txt` blocks `/admin`
- [ ] Submit sitemap to Google Search Console
- [ ] Verify OG image renders at `https://www.bergenbeat.net/api/og?title=Test`

### Performance

- [ ] Run Lighthouse on the homepage (target: 90+ Performance, 100 Accessibility)
- [ ] Check Core Web Vitals in Vercel Analytics after a few real visitors

---

## 7. Ongoing Maintenance

| Task | Frequency | Where |
|------|-----------|-------|
| Review pending submissions | Weekly | `/admin/submissions` |
| Check import log for errors | Weekly | Supabase → Tables → `import_log` |
| Review Sentry error inbox | Weekly | sentry.io |
| Update iCal sources | As needed | `/admin/import` |
| Archive old events (auto) | Nightly | Cron job |
| Add featured events | As needed | `/admin/events` → Edit → ✓ Featured |

---

_Last updated: May 2026_
