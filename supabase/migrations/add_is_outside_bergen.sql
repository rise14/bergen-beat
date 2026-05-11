-- Add is_outside_bergen flag to events
-- Lets admins mark events that take place outside Bergen County
-- (e.g. NYC day trips, neighboring county venues worth highlighting)

alter table events
  add column if not exists is_outside_bergen boolean not null default false;

create index if not exists events_outside_bergen_idx
  on events (is_outside_bergen) where is_outside_bergen = true;
