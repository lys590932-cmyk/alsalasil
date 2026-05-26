-- ============================================================
-- Customer Location Request System — Supabase Setup
-- شغّل ده مرة واحدة على Supabase SQL Editor
-- ============================================================

create table if not exists location_requests (
  token           text primary key,
  restaurant_id   text,
  restaurant_name text,
  customer_phone  text,
  customer_name   text,
  latitude        double precision,
  longitude       double precision,
  accuracy_meters double precision,
  created_at      timestamptz default now(),
  received_at     timestamptz,
  expires_at      timestamptz default (now() + interval '24 hours')
);

create index if not exists idx_locreq_restaurant on location_requests(restaurant_id);
create index if not exists idx_locreq_received  on location_requests(received_at);

alter table location_requests enable row level security;
drop policy if exists "allow all location_requests" on location_requests;
create policy "allow all location_requests" on location_requests for all using (true) with check (true);

-- ============================================================
-- DONE — أعد تحميل تطبيق المطعم
-- ============================================================
