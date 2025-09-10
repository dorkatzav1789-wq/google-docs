# הוראות הגדרת שליחת מיילים

## 1. SendGrid (מומלץ)

### שלב 1: יצירת חשבון SendGrid
1. לך ל-https://sendgrid.com
2. צור חשבון חינמי (100 מיילים ביום)
3. אמת את כתובת המייל שלך

### שלב 2: קבלת API Key
1. בפאנל SendGrid, לך ל-Settings > API Keys
2. לחץ על "Create API Key"
3. בחר "Restricted Access"
4. תן הרשאות ל-Mail Send
5. העתק את ה-API Key

### שלב 3: הגדרת משתני סביבה
צור קובץ `.env` בשורש הפרויקט:

```env
SENDGRID_API_KEY=SG.your_actual_api_key_here
FROM_EMAIL=noreply@yourcompany.com
```

### שלב 4: התקנת החבילה
```bash
npm install @sendgrid/mail
```

## 2. Mailgun (אלטרנטיבה)

### שלב 1: יצירת חשבון
1. לך ל-https://mailgun.com
2. צור חשבון חינמי (10,000 מיילים בחודש)

### שלב 2: הגדרה
```bash
npm install mailgun-js
```

הוסף ל-`server/server.js`:
```javascript
const mailgun = require('mailgun-js')({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN
});
```

## 3. Gmail SMTP (פשוט)

### הגדרה עם Nodemailer
```bash
npm install nodemailer
```

הוסף ל-`server/server.js`:
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD // לא הסיסמה הרגילה!
  }
});
```

## 4. בדיקה

לאחר ההגדרה, השרת יוכל לשלוח מיילים אמיתיים דרך התזכורות.

### בדיקה ידנית:
```bash
curl -X POST http://localhost:5000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["test@example.com"],
    "subject": "בדיקה",
    "body": "זה מייל בדיקה"
  }'
```

## הערות חשובות:

1. **אל תשתף את ה-API Keys** - שמור אותם ב-`.env` בלבד
2. **הוסף `.env` ל-`.gitignore`** כדי שלא יועלה ל-Git
3. **בפרודקשן** - הגדר את המשתנים בסביבת הפרודקשן
4. **Gmail** - צריך App Password, לא הסיסמה הרגילה
5. **SendGrid** - הכי קל לשימוש ויש חינמי

## פתרון בעיות:

- **401 Unauthorized** - בדוק את ה-API Key
- **403 Forbidden** - בדוק הרשאות ב-SendGrid
- **Invalid email** - בדוק פורמט כתובות המייל
- **Rate limit** - חכה או שדרג תוכנית

