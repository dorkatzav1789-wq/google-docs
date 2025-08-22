# הגדרת Supabase - מדריך מפורט

## שלב 1: יצירת הטבלאות ב-Supabase

1. היכנס ל-[supabase.com](https://supabase.com) ולך לפרויקט שלך
2. לך ל-**SQL Editor**
3. העתק את התוכן מקובץ `supabase-schema.sql` והדבק אותו
4. לחץ על **Run** כדי ליצור את הטבלאות

## שלב 2: התקנת התלויות

```bash
npm install
```

## שלב 3: העברת הנתונים הקיימים (אופציונלי)

אם יש לך נתונים ב-SQLite שאתה רוצה להעביר:

```bash
node migrate-data.js
```

## שלב 4: הרצת השרת

```bash
npm run dev
```

## מבנה הטבלאות

### items (פריטים)
- `id` - מזהה ייחודי
- `name` - שם הפריט
- `description` - תיאור הפריט
- `price` - מחיר
- `created_at` - תאריך יצירה

### aliases (כינויים)
- `id` - מזהה ייחודי
- `alias` - הכינוי
- `item_name` - שם הפריט המקורי
- `price_override` - מחיר חלופי (אופציונלי)
- `created_at` - תאריך יצירה

### clients (לקוחות)
- `id` - מזהה ייחודי
- `name` - שם הלקוח
- `phone` - מספר טלפון
- `company` - שם החברה
- `company_id` - ח.פ
- `created_at` - תאריך יצירה

### quotes (הצעות מחיר)
- `id` - מזהה ייחודי
- `client_id` - מזהה הלקוח
- `event_name` - שם האירוע
- `event_date` - תאריך האירוע
- `event_hours` - שעות האירוע
- `special_notes` - הערות מיוחדות
- `discount_percent` - אחוז הנחה
- `total_before_discount` - סה"כ לפני הנחה
- `discount_amount` - סכום ההנחה
- `total_after_discount` - סה"כ אחרי הנחה
- `vat_amount` - סכום מע"מ
- `final_total` - סה"כ סופי
- `created_at` - תאריך יצירה

### quote_items (פריטי הצעה)
- `id` - מזהה ייחודי
- `quote_id` - מזהה הצעת המחיר
- `item_name` - שם הפריט
- `item_description` - תיאור הפריט
- `unit_price` - מחיר יחידה
- `quantity` - כמות
- `discount` - הנחה
- `total` - סה"כ

## יתרונות השימוש ב-Supabase

1. **גיבוי אוטומטי** - הנתונים נשמרים בענן
2. **גישה מכל מקום** - לא צריך להעביר קבצי דאטהבייס
3. **ביצועים טובים** - PostgreSQL עם אופטימיזציות
4. **אבטחה** - Row Level Security מובנה
5. **Real-time** - אפשרות לעדכונים בזמן אמת
6. **API אוטומטי** - REST API מוכן לשימוש

## פתרון בעיות

### שגיאת חיבור
אם אתה מקבל שגיאת חיבור, בדוק:
1. שה-URL וה-API Key נכונים
2. שה-RLS מוגדר נכון
3. שהטבלאות נוצרו בהצלחה

### שגיאת הרשאות
אם אתה מקבל שגיאת הרשאות:
1. בדוק שה-policies מוגדרות נכון
2. בדוק שה-API Key הוא service_role (לא anon)

## שלב הבא

אחרי שהכל עובד, אתה יכול:
1. להוסיף אימות משתמשים
2. להוסיף Real-time subscriptions
3. להוסיף Storage לשמירת קבצי PDF
4. להוסיף Edge Functions ללוגיקה מורכבת

