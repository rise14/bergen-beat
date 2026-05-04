# Bergen Beat — Build Document
## Local Events Discovery Site for Bergen County, NJ

**Version:** 1.0  
**Site:** bergenbeat.net  
**Last updated:** May 2026

---

## What Bergen Beat Is

Bergen Beat is a curated local events discovery site for Bergen County, NJ. People visit to find out what's happening nearby — this weekend, tonight, or next month — and filter by what they care about. Event organizers submit listings; editors approve them. The site is clean, fast, and built for search engines.

**It is not:** a ticketing platform, a SaaS product, or a white-label tool for other cities. Those can come later. Version 1 is laser-focused on discovery.

---

## Core User Journeys

**Visitor (public)**
- Land on homepage → see what's happening this week
- Browse by category (Music, Food & Drink, Arts, Outdoors, etc.)
- Filter by date range, neighborhood, or price (free vs. paid)
- View an event detail page → click through to the organizer's own site or ticketing link
- Add event to personal calendar (iCal / Google Calendar)
- Subscribe to a weekly email digest

**Organizer (community member)**
- Submit an event via a public form
- Receive confirmation email that submission is under review
- Get notified when approved/rejected

**Editor/Admin (Bergen Beat staff)**
- Log in to dashboard
- Review submitted events → approve, reject, or edit
- Create and edit events directly
- Manage categories and neighborhoods
- View basic analytics (pageviews per event, top categories)

---

## What Is Out of Scope for Version 1

- Ticket sales or payment processing
- Organizer accounts or self-service dashboards
- Multi-tenancy / white-labeling
- User profiles or social networking features
- Native mobile app

---

## Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SEO-friendly SSR, fast, great DX |
| Language | TypeScript | Type safety, fewer runtime bugs |
| Styling | Tailwind CSS | Rapid, consistent UI |
| Database | Supabase (PostgreSQL) | Hosted Postgres, auth, storage, realtime |
| ORM | Supabase JS client + typed queries | Keeps things simple at this scale |
| Auth | Supabase Auth (email magic link) | Admin-only login; no public accounts needed |
| Maps | Mapbox GL JS | Venue maps and neighborhood browsing |
| Email | Resend | Transactional emails (submission confirmation, digest) |
| Search | Postgres full-text search (built-in) | Sufficient for MVP; upgrade to Algolia later if needed |
| Deployment | Vercel | Zero-config Next.js deployment, preview URLs |
| Image storage | Supabase Storage | Event banner images |
| Analytics | Vercel Analytics + Plausible | Privacy-friendly, no cookie banner needed |

**Keep it simple:** This is a single Next.js app — not a monorepo. Monorepos are for teams building multiple products. Start with one app, one repo.

---

## Project Structure

```
bergen-beat/
│
├── app/
│   ├── page.tsx                    ← Homepage
│   ├── events/
│   │   ├── page.tsx                ← All events browse page
│   │   └── [slug]/
│   │       └── page.tsx            ← Individual event page
│   ├── categories/
│   │   └── [slug]/
│   │       └── page.tsx            ← Events by category
│   ├── neighborhoods/
│   │   └── [slug]/
│   │       └── page.tsx            ← Events by neighborhood
│   ├── submit/
│   │   └── page.tsx                ← Public event submission form
│   ├── admin/
│   │   ├── layout.tsx              ← Auth guard wrapper
│   │   ├── page.tsx                ← Admin dashboard
│   │   ├── events/
│   │   │   ├── page.tsx            ← Event list + review queue
│   │   │   ├── new/page.tsx        ← Create event (admin)
│   │   │   └── [id]/edit/page.tsx  ← Edit event
│   │   └── submissions/
│   │       └── page.tsx            ← Review submitted events
│   └── api/
│       ├── events/route.ts
│       ├── submissions/route.ts
│       └── subscribe/route.ts
│
├── components/
│   ├── EventCard.tsx
│   ├── EventGrid.tsx
│   ├── EventMap.tsx
│   ├── FilterBar.tsx
│   ├── CategoryPill.tsx
│   ├── SubmitForm.tsx
│   └── NewsletterSignup.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← Browser client
│   │   └── server.ts               ← Server client (for RSC)
│   ├── events.ts                   ← Event query helpers
│   ├── seo.ts                      ← JSON-LD + meta tag helpers
│   └── email.ts                    ← Resend email helpers
│
├── types/
│   └── index.ts                    ← Shared TypeScript types
│
├── public/
│   └── og-default.jpg              ← Default Open Graph image
│
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Database Schema

All tables live in Supabase (PostgreSQL). Row Level Security (RLS) is enabled on all tables.

---

### categories

```sql
categories
----------
id          uuid        primary key default gen_random_uuid()
name        text        not null
slug        text        not null unique
icon        text                        -- emoji or icon name
color       text                        -- hex color for UI
sort_order  integer     default 0
```

Seed data: Music, Food & Drink, Arts & Culture, Outdoors & Nature, Sports & Fitness, 
Community, Kids & Family, Comedy, Film & Media, Nightlife, Markets & Fairs, Wellness

---

### neighborhoods

```sql
neighborhoods
-------------
id          uuid        primary key default gen_random_uuid()
name        text        not null
slug        text        not null unique
city        text
```

Seed data: Hackensack, Ridgewood, Paramus, Fort Lee, Teaneck, Englewood, 
Hoboken-adjacent, Other Bergen County

---

### venues

```sql
venues
------
id              uuid        primary key default gen_random_uuid()
name            text        not null
address         text
city            text
state           text        default 'NJ'
zip             text
lat             decimal(10,7)
lng             decimal(10,7)
neighborhood_id uuid        references neighborhoods(id)
website         text
created_at      timestamptz default now()
```

---

### events

```sql
events
------
id                  uuid        primary key default gen_random_uuid()
title               text        not null
slug                text        not null unique
description         text
short_description   text                    -- 1-2 sentence summary for cards
status              text        not null    -- 'draft' | 'published' | 'archived'
is_free             boolean     default false
price_range         text                    -- e.g. "$10–$25" or "Free"
external_url        text                    -- link to organizer's own event/tickets page
category_id         uuid        references categories(id)
venue_id            uuid        references venues(id)
neighborhood_id     uuid        references neighborhoods(id)
start_date          timestamptz not null
end_date            timestamptz
is_recurring        boolean     default false
recurrence_note     text                    -- e.g. "Every Sunday through June"
banner_url          text
organizer_name      text
organizer_email     text
featured            boolean     default false
source              text                    -- 'admin' | 'submission'
submission_id       uuid        references event_submissions(id)
published_at        timestamptz
created_at          timestamptz default now()
updated_at          timestamptz default now()
```

**Key design decisions:**
- `external_url` replaces ticketing — Bergen Beat links out, never processes payments
- `is_free` + `price_range` supports filtering without needing a payment system
- `featured` flag lets editors surface highlighted events on the homepage
- `source` tracks whether admin created it or it came from a community submission

---

### event_submissions

Holds community-submitted events before they are reviewed.

```sql
event_submissions
-----------------
id                  uuid        primary key default gen_random_uuid()
title               text        not null
description         text
is_free             boolean
price_range         text
external_url        text
category_id         uuid        references categories(id)
venue_name          text                    -- raw text, admin creates venue record if approved
venue_address       text
start_date          timestamptz
end_date            timestamptz
organizer_name      text        not null
organizer_email     text        not null
banner_url          text
status              text        default 'pending'   -- 'pending' | 'approved' | 'rejected'
admin_notes         text
reviewed_at         timestamptz
reviewed_by         uuid
created_at          timestamptz default now()
```

---

### newsletter_subscribers

```sql
newsletter_subscribers
----------------------
id          uuid        primary key default gen_random_uuid()
email       text        not null unique
confirmed   boolean     default false
token       text                        -- used for double opt-in confirmation
subscribed_at timestamptz default now()
```

---

### tags (optional, Phase 1.5)

For cross-cutting labels like "dog-friendly", "all-ages", "indoor", "outdoor", "family-friendly":

```sql
tags
----
id      uuid    primary key default gen_random_uuid()
name    text    not null unique
slug    text    not null unique

event_tags
----------
event_id    uuid    references events(id) on delete cascade
tag_id      uuid    references tags(id) on delete cascade
primary key (event_id, tag_id)
```

---

## Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (email)
RESEND_API_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# App
NEXT_PUBLIC_SITE_URL=https://www.bergenbeat.net
ADMIN_EMAIL=admin@bergenbeat.net
```

---

## Key Pages & Features

### Homepage

- Hero section: "What's happening in Bergen County"
- Featured events (manually flagged by editors)
- "This Weekend" quick section
- Category grid with icons
- Recently added events
- Newsletter signup CTA
- Map teaser showing event pins around the county

### Events Browse Page (`/events`)

- Filterable grid of all published events
- Filter bar: Category, Date range, Neighborhood, Free/Paid toggle
- Sort: Soonest, Recently added
- Pagination or infinite scroll
- Empty state handling

### Event Detail Page (`/events/[slug]`)

Full event info including:
- Banner image
- Title, date/time, location with small map
- Description
- Category + tags
- Organizer name
- "Get Tickets / More Info" button → external URL (opens in new tab)
- "Add to Calendar" buttons: Google Calendar + iCal download
- Share buttons: copy link, Facebook, Instagram link
- Related events (same category, same week)

### Category Page (`/categories/[slug]`)
- Filtered events list for one category
- Category-specific hero color/icon

### Neighborhood Page (`/neighborhoods/[slug]`)
- Events filtered by neighborhood
- Small map of the area

### Event Submission Form (`/submit`)

Public form with fields:
- Event title, description
- Category (dropdown)
- Date & time
- Venue name + address (free text — admin handles geocoding)
- Is this event free? (toggle)
- Price range (if not free)
- Link to buy tickets or learn more (required)
- Organizer name + email
- Upload banner image (optional)

On submit: confirmation email sent to organizer, event goes into admin review queue.

### Admin Dashboard (`/admin`)

Protected by Supabase magic link auth — editor email only.

Sections:
- **Submissions queue:** Pending community submissions with Approve / Reject / Edit actions
- **Events:** Full list of all events with Edit / Archive / Feature controls
- **Create event:** Full event creation form (richer than public submission)
- **Categories & Neighborhoods:** Simple CRUD management
- **Newsletter:** Subscriber count, export list

---

## SEO Strategy

SEO is the most important engineering investment for Bergen Beat. Local events with proper structured data show up in Google's event carousel and "events near me" results.

### JSON-LD Structured Data

Every event detail page must include an `Event` schema:

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Jazz Night at Hackensack Library",
  "startDate": "2026-05-10T19:00:00-04:00",
  "endDate": "2026-05-10T21:00:00-04:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Hackensack Public Library",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "574 Main St",
      "addressLocality": "Hackensack",
      "addressRegion": "NJ",
      "postalCode": "07601"
    }
  },
  "image": "https://www.bergenbeat.net/images/jazz-night.jpg",
  "description": "...",
  "url": "https://www.bergenbeat.net/events/jazz-night-hackensack",
  "isAccessibleForFree": false,
  "offers": {
    "@type": "Offer",
    "price": "15",
    "priceCurrency": "USD",
    "url": "https://external-ticket-link.com"
  }
}
```

### Meta Tags

Each event page generates:
- `<title>` — "{Event Name} | Bergen Beat"
- `<meta name="description">` — short_description
- Open Graph: `og:title`, `og:description`, `og:image` (banner), `og:url`
- Twitter Card tags

### Sitemap

Auto-generated at `/sitemap.xml` using Next.js's built-in sitemap support. Includes all published event pages, category pages, and neighborhood pages. Regenerated on-demand via Vercel ISR.

### URL Structure

Clean, readable slugs:
- `/events/jazz-night-hackensack-may-10`
- `/categories/music`
- `/neighborhoods/hackensack`

---

## Email Strategy (via Resend)

Three transactional emails:

1. **Submission confirmation** — sent to organizer when they submit an event. "Thanks! We'll review your submission within 2 business days."

2. **Submission approved** — sent when admin approves. Includes link to the live event page.

3. **Submission rejected** — sent when admin rejects. Includes optional admin note explaining why.

Optional Phase 1.5: **Weekly digest** — every Thursday, send subscribers a roundup of the best events coming up that weekend and the following week.

---

## Add to Calendar

On each event page, two options:

**Google Calendar link** (URL-based, no API key needed):
```
https://www.google.com/calendar/render?action=TEMPLATE
  &text=Event+Name
  &dates=20260510T190000Z/20260510T210000Z
  &details=Description
  &location=Venue+Address
```

**iCal download** — generate a `.ics` file via an API route at `/api/events/[slug]/ical`. Uses the `ical-generator` npm package.

---

## Map Integration (Mapbox)

- Venue coordinates stored in the `venues` table
- Each event detail page shows a small embedded map pin
- The `/events` browse page optionally includes a map view toggle
- Use Mapbox GL JS with a minimal style (no satellite, clean streets view)
- Bergen County bounding box pre-set as default viewport

---

## Deployment

**Hosting:** Vercel (free tier sufficient to start)

Steps:
1. Push repo to GitHub
2. Connect to Vercel — auto-detects Next.js
3. Add environment variables in Vercel dashboard
4. Set custom domain: `www.bergenbeat.net` → point DNS to Vercel

**Supabase:** Create a project at supabase.com. Run migrations from the SQL editor. Enable RLS on all tables.

**Image uploads:** Supabase Storage bucket named `event-banners`. Set to public read. Admin uploads via dashboard; public submissions upload directly from the browser using the anon key with a storage policy that allows inserts.

---

## Development Phases

### Phase 1 — MVP (Weeks 1–6)

Goal: Live site that editors can populate and visitors can browse.

- [ ] Next.js project setup, Tailwind, Supabase connection
- [ ] Database schema + seed data (categories, neighborhoods)
- [ ] Admin auth (magic link, single editor email)
- [ ] Admin: create / edit / publish events
- [ ] Homepage with featured events and category grid
- [ ] Events browse page with filtering
- [ ] Event detail pages with JSON-LD SEO
- [ ] Add to Calendar (Google + iCal)
- [ ] Sitemap + robots.txt
- [ ] Deploy to Vercel with custom domain

### Phase 2 — Community (Weeks 7–10)

Goal: Let the public contribute events.

- [ ] Public event submission form
- [ ] Admin submission review queue (approve / reject / edit)
- [ ] Transactional emails via Resend
- [ ] Image uploads for submissions
- [ ] Newsletter signup with double opt-in
- [ ] Map view on events page + venue maps on detail pages
- [ ] Neighborhood pages

### Phase 3 — Polish & Growth (Weeks 11–16)

Goal: Make the site discoverable and delightful.

- [ ] Tags system (dog-friendly, all-ages, etc.)
- [ ] Full-text search across event titles and descriptions
- [ ] Weekly email digest to newsletter subscribers
- [ ] Related events on detail pages
- [ ] Category pages with custom styling
- [ ] Social sharing (copy link, FB, Instagram)
- [ ] Plausible analytics integration
- [ ] Mobile-first UI polish pass
- [ ] Performance audit (Core Web Vitals target: all green)

### Phase 4 — Organizer Accounts (Future)

Revisit after the site has real traffic:

- [ ] Organizer self-service accounts (Supabase auth + org profiles)
- [ ] Organizers manage their own event listings
- [ ] Featured listing paid upgrades (Stripe, simple one-time payments)
- [ ] Ticketing integration (link out to Eventbrite/Stripe, or build in-house)

---

## Implementation Notes for Developers

- Use Next.js **Server Components** for all data-fetching pages. Only use `"use client"` for interactive components (filter bar, map, submission form).
- Use **Incremental Static Regeneration (ISR)** on event detail pages — `revalidate: 3600` — so pages are fast but update hourly.
- The admin area does NOT need ISR — fetch fresh on every request.
- All admin API routes must verify the Supabase session before mutating data.
- Supabase RLS policies: public can only SELECT published events. Admins (service role key, server-side only) can do everything. Submissions can be INSERTed by anyone.
- Slugs should be auto-generated from the event title + date (e.g., `jazz-night-hackensack-2026-05-10`) to avoid duplicates for recurring events.
- Never expose the `SUPABASE_SERVICE_ROLE_KEY` to the browser. Only use it in Server Actions or API routes.

---

## What This Document Is Not

This document describes what to build and how it should be structured. It is not a line-by-line code tutorial. A developer (or AI coding assistant) should use this as the specification to generate full implementations of each section, working through the phases in order.
