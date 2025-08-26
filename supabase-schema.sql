-- יצירת טבלאות ב-Supabase

-- טבלת פריטים (מחירון)
CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלת כינויים
CREATE TABLE IF NOT EXISTS aliases (
  id BIGSERIAL PRIMARY KEY,
  alias TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price_override DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלת לקוחות
CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  company_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלת הצעות מחיר
CREATE TABLE IF NOT EXISTS quotes (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT REFERENCES clients(id),
  event_name TEXT,
  event_date TEXT,
  event_hours TEXT,
  special_notes TEXT,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  total_before_discount DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  total_after_discount DECIMAL(10,2),
  vat_amount DECIMAL(10,2),
  final_total DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלת פריטי הצעה
CREATE TABLE IF NOT EXISTS quote_items (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT REFERENCES quotes(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL
);

-- טבלת עובדים
CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלת שעות עבודה יומיות
CREATE TABLE IF NOT EXISTS work_hours (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_worked DECIMAL(4,2) NOT NULL, -- עד 99.99 שעות
  hourly_rate DECIMAL(10,2) NOT NULL, -- השכר לשעה באותו יום
  daily_total DECIMAL(10,2) NOT NULL, -- שעות * שכר לשעה
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, work_date) -- מניעת כפילות תאריכים לעובד
);

-- יצירת אינדקסים לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
-- ייחודיות על שם פריט כדי למנוע כפילויות לוגיות
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_items_name_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_items_name_unique ON items (name)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(alias);
CREATE INDEX IF NOT EXISTS idx_aliases_item_name ON aliases(item_name);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_work_hours_employee_id ON work_hours(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_hours_work_date ON work_hours(work_date);
CREATE INDEX IF NOT EXISTS idx_work_hours_month_year ON work_hours(EXTRACT(YEAR FROM work_date), EXTRACT(MONTH FROM work_date));

-- תיקון רצפים (sequences) במקרה של ייבוא/שינויים ידניים שיצרו חוסר סנכרון
-- קובע את ערך הרצף לערך הגבוה בטבלה + 1
SELECT setval(pg_get_serial_sequence('items','id'),       COALESCE((SELECT MAX(id) FROM items), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('aliases','id'),     COALESCE((SELECT MAX(id) FROM aliases), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('clients','id'),     COALESCE((SELECT MAX(id) FROM clients), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('quotes','id'),      COALESCE((SELECT MAX(id) FROM quotes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('quote_items','id'), COALESCE((SELECT MAX(id) FROM quote_items), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('employees','id'),   COALESCE((SELECT MAX(id) FROM employees), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('work_hours','id'),  COALESCE((SELECT MAX(id) FROM work_hours), 0) + 1, false);

-- הגדרת RLS (Row Level Security) - אופציונלי
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_hours ENABLE ROW LEVEL SECURITY;

-- מדיניות גישה ציבורית (לצורך הדגמה - ניתן לשנות בהמשך)
CREATE POLICY "Allow public read access" ON items FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON aliases FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON clients FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON quotes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON quote_items FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON work_hours FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON aliases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON quote_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON work_hours FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON items FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON aliases FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON clients FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON quotes FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON quote_items FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON employees FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON work_hours FOR UPDATE USING (true);
