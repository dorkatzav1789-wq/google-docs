// server/firebasePush.js
// שליחת התראות Push דרך Firebase Cloud Messaging (Admin SDK)
"use strict";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { dbFunctions } = require("./supabase-database");

// קובץ ה-Service Account של Firebase (סוד - לא נכנס ל-git).
// מורידים מ: Project Settings → Service accounts → Generate new private key
const KEY_FILE =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "firebase-key.json");

let initialized = false;

function ensureInitialized() {
  if (initialized) return true;

  // תמיכה גם במשתנה סביבה עם ה-JSON עצמו (נוח ל-Vercel/Render)
  const jsonFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  let credential = null;
  if (jsonFromEnv) {
    credential = admin.credential.cert(JSON.parse(jsonFromEnv));
  } else if (fs.existsSync(KEY_FILE)) {
    credential = admin.credential.cert(require(KEY_FILE));
  } else {
    console.warn(
      `⚠️ Firebase: לא נמצא קובץ מפתח ב-${KEY_FILE} ולא הוגדר FIREBASE_SERVICE_ACCOUNT_JSON. התראות push לא יישלחו.`
    );
    return false;
  }

  admin.initializeApp({ credential });
  initialized = true;
  return true;
}

/**
 * שליחת התראת push.
 * @param {Object} params
 * @param {string} params.title כותרת ההתראה
 * @param {string} params.body גוף ההתראה
 * @param {string|null} params.userEmail אם צוין - שליחה רק למכשירים של המשתמש הזה, אחרת לכולם
 * @param {Object} [params.data] נתונים נוספים (למשל url לפתיחה בלחיצה)
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendPushNotification({ title, body, userEmail = null, data = {} }) {
  if (!ensureInitialized()) {
    throw new Error("Firebase Admin לא מאותחל - חסר מפתח Service Account");
  }

  const tokenRows = await dbFunctions.getPushTokens(userEmail);
  const tokens = tokenRows.map((r) => r.token).filter(Boolean);

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // ניקוי טוקנים שכבר לא בתוקף (מכשיר הוסר / הרשאה בוטלה)
  const invalidCodes = [
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
    "messaging/invalid-argument",
  ];
  await Promise.all(
    response.responses.map(async (res, i) => {
      if (!res.success && invalidCodes.includes(res.error?.code)) {
        try {
          await dbFunctions.deletePushToken(tokens[i]);
          console.log("🧹 נמחק טוקן לא תקף:", tokens[i].slice(0, 20) + "...");
        } catch (_) {
          // מחיקה נכשלה - לא קריטי
        }
      }
    })
  );

  return { sent: response.successCount, failed: response.failureCount };
}

module.exports = { sendPushNotification };
