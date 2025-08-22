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

-- יצירת אינדקסים לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(alias);
CREATE INDEX IF NOT EXISTS idx_aliases_item_name ON aliases(item_name);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- הגדרת RLS (Row Level Security) - אופציונלי
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- מדיניות גישה ציבורית (לצורך הדגמה - ניתן לשנות בהמשך)
CREATE POLICY "Allow public read access" ON items FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON aliases FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON clients FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON quotes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON quote_items FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON aliases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON quote_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON items FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON aliases FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON clients FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON quotes FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON quote_items FOR UPDATE USING (true);
