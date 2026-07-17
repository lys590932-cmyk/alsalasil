-- ═══════════════════════════════════════════════════════════════════
-- نظام إدارة المخزن والفروع — إعداد Supabase
-- Warehouse Management System — Supabase Setup
-- ═══════════════════════════════════════════════════════════════════
-- 📋 كيفية التشغيل:
-- 1. افتح Supabase → SQL Editor → New Query
-- 2. الصق كل هذا الملف
-- 3. اضغط "Run"
-- 4. انتظر رسالة النجاح ✅
-- ═══════════════════════════════════════════════════════════════════

-- 🗑️ حذف أي جداول قديمة (اختياري - لبداية نظيفة)
-- DROP TABLE IF EXISTS warehouse_records CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- 📊 الجدول الرئيسي: سجلات المخزن
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS warehouse_records (
  id              TEXT PRIMARY KEY,
  date            DATE NOT NULL,
  branch          TEXT NOT NULL,
  keeper          TEXT DEFAULT 'المخزن',
  chicken         NUMERIC(10,2) DEFAULT 0,
  meat            NUMERIC(10,2) DEFAULT 0,
  naimi           NUMERIC(10,2) DEFAULT 0,
  dawaner         NUMERIC(10,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 🔍 فهرس على التاريخ للبحث السريع
CREATE INDEX IF NOT EXISTS idx_warehouse_date ON warehouse_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_branch ON warehouse_records(branch);
CREATE INDEX IF NOT EXISTS idx_warehouse_date_branch ON warehouse_records(date, branch);

-- ⏰ تحديث تلقائي للـtimestamp
CREATE OR REPLACE FUNCTION update_warehouse_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS warehouse_updated_at_trigger ON warehouse_records;
CREATE TRIGGER warehouse_updated_at_trigger
  BEFORE UPDATE ON warehouse_records
  FOR EACH ROW EXECUTE FUNCTION update_warehouse_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 🔓 صلاحيات (RLS) — للبساطة نسمح لكل من عنده الرابط
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE warehouse_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warehouse_public_access" ON warehouse_records;
CREATE POLICY "warehouse_public_access" ON warehouse_records
  FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- 🔊 تفعيل Realtime للمزامنة اللحظية
-- ═══════════════════════════════════════════════════════════════════
-- ملاحظة: تفعيل Realtime من الواجهة أسهل:
-- Database → Replication → warehouse_records → Enable
-- أو بالكود:
ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_records;

-- ═══════════════════════════════════════════════════════════════════
-- ✅ رسالة النجاح
-- ═══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ نظام المخزن جاهز على Supabase!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 الخطوات التالية:';
  RAISE NOTICE '1. اذهب إلى Settings → API';
  RAISE NOTICE '2. انسخ Project URL و anon public key';
  RAISE NOTICE '3. الصقهم في نظام_المخزن.html في القسم SUPABASE CONFIG';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 بعدها البيانات تتزامن لحظياً بين كل الأجهزة!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
