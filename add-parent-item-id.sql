-- הוספת עמודת parent_item_id לטבלת quote_items
-- הרץ את הקובץ הזה ב-Supabase SQL Editor

-- הוספת העמודה
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS parent_item_id INTEGER;

-- הוספת אינדקס לביצועים
CREATE INDEX IF NOT EXISTS idx_quote_items_parent ON quote_items(parent_item_id);


