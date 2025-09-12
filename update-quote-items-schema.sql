-- עדכון טבלת quote_items להוספת עמודות sort_order ו-parent_item_id
-- הרץ את הקובץ הזה ב-Supabase SQL Editor

-- הוספת עמודת sort_order
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS sort_order DECIMAL(10,2) DEFAULT 0;

-- הוספת עמודת parent_item_id
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS parent_item_id INTEGER REFERENCES quote_items(id) ON DELETE CASCADE;

-- עדכון הפריטים הקיימים עם sort_order על בסיס ה-id שלהם
UPDATE quote_items SET sort_order = id WHERE sort_order = 0 OR sort_order IS NULL;

-- הוספת אינדקסים לביצועים טובים יותר
CREATE INDEX IF NOT EXISTS idx_quote_items_sort_order ON quote_items(quote_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quote_items_parent ON quote_items(parent_item_id);
