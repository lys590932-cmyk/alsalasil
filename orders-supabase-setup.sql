-- ============================================================
-- Al-Salasil Orders System — Supabase Setup
-- Run ONCE in Supabase SQL Editor (safe to re-run)
-- يبني نظام استقبال الأوردرات من المطاعم وتوزيعها على السائقين
-- ============================================================

-- (1) جدول المطاعم
create table if not exists restaurants (
  id            text primary key,           -- مثل R001
  name          text not null,              -- اسم المطعم
  pin           text not null default '0000',
  phone         text,
  address       text,
  latitude      double precision,
  longitude     double precision,
  contact_name  text,
  active        boolean default true,
  created_at    timestamptz default now()
);
create index if not exists idx_restaurants_active on restaurants(active);

-- (2) جدول الأوردرات (القلب)
create table if not exists orders (
  id                bigserial primary key,
  restaurant_id     text not null references restaurants(id),
  restaurant_name   text,
  -- بيانات العميل
  customer_name     text,
  customer_phone    text not null,
  customer_address  text not null,
  customer_lat      double precision,
  customer_lng      double precision,
  -- المبلغ والدفع
  order_amount      numeric(10,3) default 0,    -- قيمة طلب الأكل
  payment_method    text default 'cash',         -- cash | paid (paid online مسبقاً)
  delivery_fee      numeric(10,3) default 0,     -- ما يدفعه المطعم لشركة السلاسل
  distance_km       numeric(6,2) default 0,
  -- التوزيع
  status            text default 'pending',      -- pending | assigned | picked_up | delivered | cancelled
  driver_id         text,                        -- مثل SA1001
  driver_name       text,
  -- ملاحظات وتواريخ
  notes             text,
  created_at        timestamptz default now(),
  assigned_at       timestamptz,
  picked_at         timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  cancel_reason     text
);
create index if not exists idx_orders_status     on orders(status);
create index if not exists idx_orders_driver     on orders(driver_id);
create index if not exists idx_orders_restaurant on orders(restaurant_id);
create index if not exists idx_orders_created    on orders(created_at desc);

-- (3) صلاحيات RLS مفتوحة (نستخدم publishable key)
alter table restaurants enable row level security;
alter table orders      enable row level security;

drop policy if exists "allow all restaurants" on restaurants;
drop policy if exists "allow all orders"      on orders;

create policy "allow all restaurants" on restaurants for all using (true) with check (true);
create policy "allow all orders"      on orders      for all using (true) with check (true);

-- (4) مطعم تجريبي (تقدر تعدله أو تحذفه)
insert into restaurants (id, name, pin, phone, address, latitude, longitude, contact_name)
values ('R001', 'مطعم تجريبي', '1234', '99000000', 'مدينة الكويت — شارع الخليج',
        29.3759, 47.9774, 'المدير')
on conflict (id) do nothing;

-- ============================================================
-- DONE — أعد تحميل التطبيقات بعد التشغيل
-- ============================================================
