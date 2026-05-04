# Supabase Setup Guide for Bergen Beat

Follow these steps in order. The whole thing takes about 15 minutes.

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** and sign in (or create a free account).
2. Click **New project**.
3. Fill in:
   - **Name:** `bergen-beat`
   - **Database password:** choose a strong password and save it somewhere safe
   - **Region:** `US East (N. Virginia)` — closest to NJ
4. Click **Create new project** and wait ~2 minutes for it to provision.

---

## Step 2 — Run the schema

1. In your Supabase project, go to the left sidebar → **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/schema.sql` from this project folder.
4. Copy the entire contents and paste them into the SQL Editor.
5. Click **Run** (or press `Cmd+Enter`).

You should see: `Success. No rows returned.`

This creates all tables, indexes, RLS policies, and seeds the 12 categories, 13 neighborhoods, and one sample event.

---

## Step 3 — Create the image storage bucket

1. In the sidebar → **Storage**.
2. Click **New bucket**.
3. Name it: `event-banners`
4. Check **Public bucket** (event images are public).
5. Click **Save**.

Then add an upload policy so the public submit form can upload images:

1. Click the `event-banners` bucket → **Policies** tab.
2. Click **New policy** → **For full customization**.
3. Set:
   - **Policy name:** `allow_public_uploads`
   - **Allowed operation:** `INSERT`
   - **Target roles:** `anon`
   - **Policy definition:** `true`
4. Save.

---

## Step 4 — Get your API keys

1. In the sidebar → **Project Settings** → **API**.
2. You'll find three values you need:

| Key | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "Project API keys" → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | "Project API keys" → `service_role` `secret` |

⚠️ The `service_role` key has full database access. Never put it in client-side code or commit it to git.

---

## Step 5 — Fill in .env.local

In the `bergen-beat` project folder, copy the example file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the three Supabase values from Step 4.

Leave the Mapbox and Resend keys blank for now — the site works without them, it just won't have maps or send emails yet.

Your `.env.local` should look like:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

RESEND_API_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=

NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAIL=admin@bergenbeat.net
```

---

## Step 6 — Install dependencies and run

```bash
cd bergen-beat
npm install
npm run dev
```

Open **http://localhost:3000** — you should see the homepage with the sample Jazz Night event.

---

## Step 7 — Set up admin login

The admin dashboard is at **/admin**. It uses Supabase magic link auth.

1. In Supabase → **Authentication** → **Email Templates** → confirm the "Magic Link" template looks good (the default is fine).
2. In Supabase → **Authentication** → **URL Configuration**, set:
   - **Site URL:** `http://localhost:3000` (change to `https://www.bergenbeat.net` before going live)
   - **Redirect URLs:** add `http://localhost:3000/**`
3. Set `ADMIN_EMAIL` in `.env.local` to the email address you want to log in with.

To log in: go to `/admin/login`, enter your email, check your inbox, click the magic link.

---

## Step 8 (optional) — Set up Resend for email

1. Go to **https://resend.com** and create a free account.
2. Add and verify your domain (`bergenbeat.net`) in Resend → Domains.
3. Create an API key and add it to `.env.local` as `RESEND_API_KEY`.
4. Update `FROM_ADDRESS` in `lib/email.ts` if needed.

The free Resend tier (100 emails/day) is more than enough for Bergen Beat.

---

## Step 9 (optional) — Set up Mapbox for venue maps

1. Go to **https://mapbox.com** and create a free account.
2. Copy your default public token from the dashboard.
3. Add it to `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`.
4. Run `npm install mapbox-gl @types/mapbox-gl`.

The free Mapbox tier (50,000 map loads/month) is plenty to start.

---

## Verifying everything works

After `npm run dev`, check:

- **http://localhost:3000** — homepage with the sample event card
- **http://localhost:3000/events** — events browse page
- **http://localhost:3000/categories/music** — category page
- **http://localhost:3000/neighborhoods/hackensack** — neighborhood page
- **http://localhost:3000/submit** — public event submission form
- **http://localhost:3000/admin** — redirects to login if not authenticated
- **http://localhost:3000/sitemap.xml** — sitemap with all published events

---

## Deploying to Vercel

When you're ready to go live:

1. Push the repo to GitHub.
2. Go to **https://vercel.com** → **Add New Project** → import your GitHub repo.
3. Vercel auto-detects Next.js — just click **Deploy**.
4. In Vercel → **Settings** → **Environment Variables**, add all the keys from your `.env.local`.
5. In Vercel → **Settings** → **Domains**, add `www.bergenbeat.net` and follow the DNS instructions.
6. Update `NEXT_PUBLIC_SITE_URL` in Vercel env vars to `https://www.bergenbeat.net`.
7. In Supabase → **Authentication** → **URL Configuration**, update Site URL and add the production redirect URL.

That's it — the site is live.
