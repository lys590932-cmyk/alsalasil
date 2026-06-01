-- ============================================================
-- نظام STREAM — جمعيات تعاونية
-- شغّل ده مرة واحدة على Supabase SQL Editor
-- ============================================================

-- جدول الجمعيات التعاونية
create table if not exists societies (
  id           text primary key,                -- مثال: 'FAHAHEEL'
  name         text not null,                   -- جمعية الفحيحيل التعاونية
  name_en      text,                            -- Fahaheel Cooperative Society
  area         text,                            -- الفحيحيل
  manager_name text,                            -- اسم المدير المسؤول
  manager_phone text,
  manager_email text,
  pin          text not null,                   -- رمز الدخول
  logo_url     text,                            -- شعار الجمعية
  brand_color  text default '#0F3A52',          -- لون الهوية
  active       boolean default true,
  contract_start date,
  contract_end   date,
  notes        text,
  created_at   timestamptz default now()
);

create index if not exists idx_societies_active on societies(active);

-- إضافة دعم الجمعيات لجدول الطلبات
alter table orders
  add column if not exists society_id   text references societies(id) on delete set null,
  add column if not exists member_id    text,                          -- رقم عضوية العميل (اختياري)
  add column if not exists member_name  text,                          -- اسم العضو
  add column if not exists source       text default 'restaurant';     -- restaurant | society | direct

create index if not exists idx_orders_society on orders(society_id) where society_id is not null;
create index if not exists idx_orders_source on orders(source);

-- جدول قاعدة بيانات أعضاء الجمعية
create table if not exists society_members (
  id           bigserial primary key,
  society_id   text references societies(id) on delete cascade,
  member_id    text,                            -- رقم العضوية
  name         text not null,
  phone        text,
  area         text,
  block        text,
  street       text,
  building     text,
  notes        text,
  total_orders int default 0,
  last_order   timestamptz,
  created_at   timestamptz default now(),
  unique(society_id, member_id)
);

create index if not exists idx_society_members on society_members(society_id);
create index if not exists idx_society_members_phone on society_members(society_id, phone);

-- RLS Policies
alter table societies enable row level security;
alter table society_members enable row level security;

drop policy if exists "societies select all" on societies;
drop policy if exists "societies update all" on societies;
drop policy if exists "society_members all" on society_members;

create policy "societies select all" on societies for select using (true);
create policy "societies update all" on societies for update using (true) with check (true);
create policy "society_members all" on society_members for all using (true) with check (true);

-- إدراج جمعية الفحيحيل كأول جمعية (تجريبي)
insert into societies (id, name, name_en, area, manager_name, pin, brand_color, active)
values ('FAHAHEEL', 'جمعية الفحيحيل التعاونية', 'Fahaheel Cooperative Society',
        'الفحيحيل', 'إدارة الجمعية', '1234', '#0F3A52', true)
on conflict (id) do nothing;

-- ============================================================
-- DONE — افتح society.html
-- ============================================================
