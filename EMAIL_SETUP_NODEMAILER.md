# הוראות הגדרת Nodemailer

## 1. התקנה

```bash
npm install nodemailer
```

## 2. הגדרת Gmail

### שלב 1: הפעל 2-Factor Authentication
1. לך ל-Google Account Settings
2. Security > 2-Step Verification
3. הפעל את 2-Factor Authentication

### שלב 2: צור App Password
1. לך ל-Google Account Settings
2. Security > 2-Step Verification > App passwords
3. בחר "Mail" ו-"Other (Custom name)"
4. כתוב "Node.js App"
5. העתק את ה-App Password (16 תווים)

### שלב 3: הגדר משתני סביבה
צור קובץ `.env` בשורש הפרויקט:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

## 3. הרצה

```bash
npm run dev
```

## 4. בדיקה

צור תזכורת חדשה ותגיד לי אם זה עובד!

## פתרון בעיות:

- **535 Authentication failed** - בדוק את ה-App Password
- **535 Invalid credentials** - בדוק את כתובת המייל
- **Connection timeout** - בדוק את החיבור לאינטרנט

## הערות חשובות:

1. **אל תשתמש בסיסמה הרגילה** - רק App Password
2. **App Password הוא 16 תווים** ללא רווחים
3. **2-Factor Authentication חובה** - לא עובד בלעדיו

