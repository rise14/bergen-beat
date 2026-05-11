-- Add description and hero image URL to venues and neighborhoods
-- Run this in the Supabase SQL editor

alter table venues
  add column if not exists description text,
  add column if not exists hero_url    text;

alter table neighborhoods
  add column if not exists description text,
  add column if not exists hero_url    text;
