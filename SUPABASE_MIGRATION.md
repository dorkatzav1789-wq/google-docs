# מעבר ל-Supabase - הוראות

## שלב 1: עדכון ה-Schema ב-Supabase

1. היכנס ל-[supabase.com](https://supabase.com) ולך לפרויקט שלך
2. לך ל-**SQL Editor**
3. העתק את התוכן מקובץ `supabase-schema.sql` והדבק אותו
4. לחץ על **Run** כדי ליצור את כל הטבלאות

## שלב 2: בדיקה שהטבלאות נוצרו

בדוק שהטבלאות הבאות נוצרו:
- ✅ `users` (כבר קיימת)
- ✅ `items`
- ✅ `aliases`
- ✅ `clients`
- ✅ `quotes`
- ✅ `quote_items`
- ✅ `employees`
- ✅ `work_hours`
- ✅ `reminders`

## שלב 3: הרצת האפליקציה

```bash
cd client
npm start
```

## מה השתנה:

### ✅ **הוסרו:**
- Node.js backend API calls
- axios interceptor עם localStorage
- multiple GoTrueClient instances

### ✅ **נוסף:**
- Supabase API ישיר (`supabaseAPI.ts`)
- בדיקה ראשונית של הסשן
- טיפול טוב יותר בשגיאות
- RLS policies לכל הטבלאות

### ✅ **תוקן:**
- מערכת האימות עובדת רק עם Supabase
- הסשן נטען נכון
- אין יותר multiple instances

## בדיקות:

1. **התחברות**: בדוק שההתחברות עובדת
2. **רענון דף**: בדוק שלא חוזרים לעמוד התחברות
3. **יצירת הצעת מחיר**: בדוק שזה עובד
4. **ניהול עובדים**: בדוק שזה עובד

אם הכל עובד, האפליקציה עכשיו משתמשת רק ב-Supabase!

