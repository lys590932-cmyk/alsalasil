-- ============================================================
-- MyFatoorah Online Payment — Supabase Setup
-- شغّل ده مرة واحدة على Supabase SQL Editor
-- ============================================================

-- (1) إضافة حقول الدفع الإلكتروني لجدول الأوردرات
alter table orders
  add column if not exists payment_url     text,           -- لينك الدفع من MyFatoorah
  add column if not exists payment_id      text,           -- InvoiceId من MyFatoorah
  add column if not exists payment_status  text default 'unpaid',  -- unpaid | pending | paid | failed
  add column if not exists payment_paid_at timestamptz,
  add column if not exists payment_ref     text,           -- مرجع المعاملة
  add column if not exists customer_ref    text;           -- مرجع داخلي يستخدمه MyFatoorah

create index if not exists idx_orders_customer_ref on orders(customer_ref);
create index if not exists idx_orders_payment_status on orders(payment_status);

-- (2) جدول إعدادات النظام (لتخزين مفتاح MyFatoorah وغيره)
create table if not exists app_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz default now()
);

alter table app_settings enable row level security;
drop policy if exists "allow all app_settings" on app_settings;
create policy "allow all app_settings" on app_settings for all using (true) with check (true);

-- تهيئة قيم افتراضية لإعدادات MyFatoorah
insert into app_settings (key, value) values
  ('myfatoorah_api_key',  ''),                                -- المفتاح يتم إدخاله من الإدارة لاحقاً
  ('myfatoorah_base_url', 'https://apitest.myfatoorah.com'),  -- اختبار افتراضياً، غيره لـ https://api.myfatoorah.com للإنتاج
  ('myfatoorah_enabled',  'false')                            -- يتفعّل بعد إدخال المفتاح
on conflict (key) do nothing;

-- ============================================================
-- DONE — أعد تحميل التطبيقات بعد التشغيل
-- ============================================================
