import React, { useEffect, useState } from 'react';
import { Reminder } from '../types';
import { remindersAPI } from '../services/api';
import { emailService } from '../services/emailService';
import ReminderStatus from './ReminderStatus';

interface ReminderServiceProps {
  children: React.ReactNode;
}

const ReminderService: React.FC<ReminderServiceProps> = ({ children }) => {
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // בדיקת תזכורות כל 5 דקות
  useEffect(() => {
    const checkReminders = async () => {
      try {
        console.log('בודק תזכורות...', new Date().toLocaleTimeString());
        const reminders = await remindersAPI.getPending();
        console.log('נמצאו תזכורות:', reminders);
        setPendingReminders(reminders);
        setLastCheck(new Date());
      } catch (error) {
        console.error('שגיאה בבדיקת תזכורות:', error);
      }
    };

    // בדיקה ראשונית
    checkReminders();

    // בדיקה כל 5 דקות
    // בדיקה כל דקה (זמני - לצורך בדיקה)
    const interval = setInterval(checkReminders, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // הצגת התראות לתזכורות
  useEffect(() => {
    if (pendingReminders.length > 0) {
      pendingReminders.forEach(async (reminder) => {
        if (reminder.quotes) {
          const eventName = reminder.quotes?.[0]?.event_name || 'אירוע';
          const eventDate = reminder.quotes?.[0]?.event_date;
          
          // יצירת הודעה מותאמת
          let message = `תזכורת: האירוע "${eventName}" מתקיים ב-${new Date(eventDate).toLocaleDateString('he-IL')}`;
          
          if (reminder.message) {
            message += `\n\nהודעה מותאמת: ${reminder.message}`;
          } else if (reminder.quotes?.[0]?.special_notes) {
            message += `\n\nהערות: ${reminder.quotes[0].special_notes}`;
          }

          // שליחת מייל אם יש כתובות מייל
          if (reminder.email_addresses && reminder.email_addresses.length > 0) {
            try {
              await emailService.sendReminderEmail(
                reminder.email_addresses,
                `תזכורת: ${eventName}`,
                message
              );
              console.log('📧 מייל נשלח בהצלחה עבור:', eventName);
            } catch (error) {
              console.error('שגיאה בשליחת מייל:', error);
            }
          }

          // הצגת התראה בדפדפן
          if (Notification.permission === 'granted') {
            new Notification('תזכורת אירוע', {
              body: message,
              icon: '/favicon.ico',
              tag: `reminder-${reminder.id}`
            });
          } else if (Notification.permission !== 'denied') {
            // בקשת הרשאה להתראות
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('תזכורת אירוע', {
                  body: message,
                  icon: '/favicon.ico',
                  tag: `reminder-${reminder.id}`
                });
              }
            });
          }

          // סימון התזכורת כנשלחה
          try {
            await remindersAPI.markAsSent(reminder.id!);
          } catch (error) {
            console.error('שגיאה בסימון תזכורת כנשלחה:', error);
          }
        }
      });
    }
  }, [pendingReminders]);

  return (
    <>
      {children}
      <ReminderStatus />
      {/* אינדיקטור סטטוס (אופציונלי) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-2 rounded text-xs">
          תזכורות: {pendingReminders.length} | 
          בדיקה אחרונה: {lastCheck?.toLocaleTimeString('he-IL') || 'לא בוצעה'}
        </div>
      )}
    </>
  );
};

export default ReminderService;
