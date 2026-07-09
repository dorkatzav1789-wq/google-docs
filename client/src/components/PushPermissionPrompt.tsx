// components/PushPermissionPrompt.tsx
// פופ-אפ שמבקש מהמשתמש לאשר התראות push אם עדיין לא אישר
import React, { useEffect, useState } from 'react';
import { registerForPushNotifications } from '../services/firebaseMessaging';

interface PushPermissionPromptProps {
  userEmail: string;
}

const DISMISS_KEY = 'push-prompt-dismissed-at';
// אם המשתמש סגר את הפופ-אפ - לא מציקים לו שוב במשך 7 ימים
const DISMISS_DAYS = 7;

function wasRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

const PushPermissionPrompt: React.FC<PushPermissionPromptProps> = ({ userEmail }) => {
  const [visible, setVisible] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // דפדפנים בלי תמיכה בהתראות (למשל Safari ב-iOS ללא התקנה כאפליקציה)
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      // כבר אושר - רק מרעננים/רושמים את הטוקן בשקט
      registerForPushNotifications(userEmail);
      return;
    }

    if (wasRecentlyDismissed()) return;

    setDenied(Notification.permission === 'denied');
    setVisible(true);
  }, [userEmail]);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const token = await registerForPushNotifications(userEmail);
      if (token) {
        setVisible(false);
        return;
      }
      // לא התקבל טוקן - אם המשתמש חסם, נציג הוראות ידניות
      if (Notification.permission === 'denied') {
        setDenied(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-2xl transition-colors">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-3xl">🔔</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            הפעלת התראות
          </h2>
        </div>

        {denied ? (
          <>
            <p className="mb-3 text-gray-700 dark:text-gray-300">
              התראות חסומות כרגע בדפדפן, ולכן לא נוכל לעדכן אותך על אירועים ותזכורות.
            </p>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              כדי לאפשר אותן ידנית: לחץ על אייקון המנעול 🔒 ליד כתובת האתר, בחר
              &quot;הרשאות&quot; ← &quot;התראות&quot; ← &quot;אפשר&quot;, ואז רענן את הדף.
            </p>
            <div className="flex justify-end">
              <button
                onClick={handleDismiss}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                הבנתי
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              כדי לקבל עדכונים על אירועים, תזכורות והתראות חשובות גם כשהמערכת סגורה,
              יש לאשר קבלת התראות בדפדפן.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDismiss}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                לא עכשיו
              </button>
              <button
                onClick={handleEnable}
                disabled={busy}
                className="px-5 py-2 rounded-lg bg-blue-500 dark:bg-blue-600 text-white font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {busy ? 'מפעיל...' : 'אפשר התראות'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PushPermissionPrompt;
