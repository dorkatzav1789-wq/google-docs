-- עדכון policy עבור quote_items כדי לאפשר למשתמשים מחוברים לעדכן פריטים

-- מחיקת ה-policy הקיים
DROP POLICY IF EXISTS "Only admins can modify quote_items" ON quote_items;

-- יצירת policy חדש שמאפשר למשתמשים מחוברים לעדכן פריטים
CREATE POLICY "Authenticated users can modify quote_items" ON quote_items FOR ALL USING (
    auth.uid() IS NOT NULL
);
