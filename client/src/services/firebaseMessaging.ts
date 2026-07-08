// services/firebaseMessaging.ts
// ניהול התראות Push עם Firebase Cloud Messaging (FCM)

import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  Messaging,
  MessagePayload,
} from 'firebase/messaging';

// קונפיגורציית ה-web של Firebase (ציבורית - בטוחה לחשיפה)
const firebaseConfig = {
  apiKey: 'AIzaSyCstYGVEgPDlBefAL2wqzxGXrcEfkbWGtE',
  authDomain: 'doc-ca356.firebaseapp.com',
  projectId: 'doc-ca356',
  storageBucket: 'doc-ca356.firebasestorage.app',
  messagingSenderId: '1004182299951',
  appId: '1:1004182299951:web:4636a791b6d0df96a02dda',
};

// מפתח VAPID מקונסולת Firebase:
// Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';

const app = initializeApp(firebaseConfig);

let messagingInstance: Messaging | null = null;

async function getMessagingIfSupported(): Promise<Messaging | null> {
  // דפדפנים מסוימים (למשל Safari ישן / iOS ללא PWA) לא תומכים ב-FCM
  if (!(await isSupported())) {
    console.warn('FCM: הדפדפן לא תומך בהתראות push');
    return null;
  }
  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }
  return messagingInstance;
}

/**
 * מבקש הרשאת התראות, מפיק טוקן FCM ורושם אותו בשרת.
 * מחזיר את הטוקן אם הצליח, אחרת null.
 */
export async function registerForPushNotifications(
  userEmail: string
): Promise<string | null> {
  try {
    if (!VAPID_KEY) {
      console.warn('FCM: חסר REACT_APP_FIREBASE_VAPID_KEY בקובץ client/.env');
      return null;
    }

    const messaging = await getMessagingIfSupported();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('FCM: המשתמש לא אישר קבלת התראות');
      return null;
    }

    // רישום ה-service worker שמטפל בהתראות ברקע
    const swRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js'
    );

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn('FCM: לא התקבל טוקן');
      return null;
    }

    // שמירת הטוקן בשרת
    const response = await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, user_email: userEmail }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('FCM: שמירת הטוקן בשרת נכשלה:', err);
      return null;
    }

    console.log('FCM: הטוקן נרשם בהצלחה');
    return token;
  } catch (error) {
    console.error('FCM: שגיאה ברישום להתראות:', error);
    return null;
  }
}

/**
 * מאזין להתראות שמגיעות כשהאפליקציה פתוחה (foreground).
 * מחזיר פונקציית ביטול הרשמה.
 */
export async function listenToForegroundMessages(
  callback: (payload: MessagePayload) => void
): Promise<(() => void) | null> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;
  return onMessage(messaging, callback);
}
