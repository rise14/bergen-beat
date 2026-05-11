-- Supabase Storage bucket for event banner images
-- Run this in the Supabase SQL editor (or via CLI).

-- Create the bucket (public = URLs readable without auth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  5242880,   -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Allow the service role to upload (our API route uses the admin/service client)
-- Public reads are already allowed because the bucket is public.
-- No additional RLS policies are needed — the service role bypasses RLS.

-- Optional: allow authenticated users (Supabase dashboard uploads, etc.)
create policy "Authenticated users can upload event images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-images');

create policy "Public can read event images"
  on storage.objects for select
  to public
  using (bucket_id = 'event-images');
