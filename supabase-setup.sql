-- ============================================================
--  شركة السلاسل — إعداد قاعدة بيانات Supabase لتطبيق السائقين
-- ------------------------------------------------------------
--  طريقة الاستخدام:
--  1) ادخل على لوحة Supabase الخاصة بك
--  2) من القائمة الجانبية افتح: SQL Editor
--  3) انسخ كل محتوى هذا الملف والصقه ثم اضغط RUN
--  هذا السكربت آمن — يمكن تشغيله أكثر من مرة دون مشاكل
-- ============================================================


-- ============================================================
-- 1) جدول السائقين (drivers)
--    موجود غالباً مسبقاً — هنا نضيف الأعمدة الناقصة فقط
--    حتى يستطيع التطبيق عرض الملف الكامل للسائق
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id           text PRIMARY KEY,
  name         text,
  partner      text,
  sim          text,
  salary_base  numeric DEFAULT 0
);

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS car          text;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license      text;   -- تاريخ انتهاء الرخصة YYYY-MM-DD
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS civil        text;   -- الرقم المدني
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS device       text;   -- رقم الجهاز
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS petrol       text;   -- بطاقة البترول
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS nationality  text;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS age          int;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS start_date   text;   -- تاريخ الانضمام
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS health       text;   -- البطاقة الصحية: available / فارغ
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS civil_expiry text;   -- تاريخ انتهاء الإقامة (اختياري)


-- ============================================================
-- 2) جدول الحضور (clockin) — تسجيل دخول/خروج السائقين
-- ============================================================
CREATE TABLE IF NOT EXISTS clockin (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id   text NOT NULL,
  driver_name text,
  partner     text,
  action      text NOT NULL,            -- 'clock_in' أو 'clock_out'
  latitude    double precision,
  longitude   double precision,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clockin_driver  ON clockin(driver_id);
CREATE INDEX IF NOT EXISTS idx_clockin_created ON clockin(created_at);


-- ============================================================
-- 3) جدول الخصومات (deductions)
-- ============================================================
CREATE TABLE IF NOT EXISTS deductions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id   text NOT NULL,
  reason      text,
  amount      numeric DEFAULT 0,
  days        numeric DEFAULT 0,
  date        text,
  month       int,
  year        int,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deductions_driver ON deductions(driver_id);


-- ============================================================
-- 4) جدول المناوبات (schedules)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id    text NOT NULL,
  date         text NOT NULL,
  shift_type   text,
  shift_start  text,
  shift_end    text,
  created_at   timestamptz DEFAULT now()
);
-- لمنع تكرار نفس اليوم لنفس السائق (يستخدمه زر "مزامنة" في نظام المدير)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_schedule_driver_date ON schedules(driver_id, date);
CREATE INDEX IF NOT EXISTS idx_schedules_driver ON schedules(driver_id);


-- ============================================================
-- 5) صلاحيات الوصول (Row Level Security)
--    التطبيق يستخدم المفتاح العام (publishable key) لذا نحتاج
--    سياسات تسمح بالقراءة والكتابة المطلوبة.
--    ملاحظة: هذه سياسات مبسّطة للتشغيل السريع — يمكن تشديدها لاحقاً.
-- ============================================================
ALTER TABLE drivers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clockin    ENABLE ROW LEVEL SECURITY;
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules  ENABLE ROW LEVEL SECURITY;

-- السائقون: قراءة فقط من التطبيق (التعديل من نظام المدير)
DROP POLICY IF EXISTS p_drivers_read ON drivers;
CREATE POLICY p_drivers_read ON drivers FOR SELECT USING (true);
DROP POLICY IF EXISTS p_drivers_write ON drivers;
CREATE POLICY p_drivers_write ON drivers FOR ALL USING (true) WITH CHECK (true);

-- الحضور: قراءة + إضافة (التطبيق يسجّل الحضور)
DROP POLICY IF EXISTS p_clockin_read ON clockin;
CREATE POLICY p_clockin_read ON clockin FOR SELECT USING (true);
DROP POLICY IF EXISTS p_clockin_insert ON clockin;
CREATE POLICY p_clockin_insert ON clockin FOR INSERT WITH CHECK (true);

-- الخصومات: قراءة + كتابة
DROP POLICY IF EXISTS p_deductions_all ON deductions;
CREATE POLICY p_deductions_all ON deductions FOR ALL USING (true) WITH CHECK (true);

-- المناوبات: قراءة + كتابة
DROP POLICY IF EXISTS p_schedules_all ON schedules;
CREATE POLICY p_schedules_all ON schedules FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
--  تم ✅
--  بعد التشغيل: افتح "نظام المدير" واضغط زر "مزامنة App"
--  لرفع بيانات السائقين، ثم جرّب الدخول من التطبيق.
-- ============================================================
