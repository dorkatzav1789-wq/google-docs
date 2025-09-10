import React, { useState, useEffect } from 'react';
import { Reminder } from '../types';
import { remindersAPI } from '../services/api';

const ReminderStatus: React.FC = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [recentReminders, setRecentReminders] = useState<Reminder[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadReminderStatus();
    // בדיקה כל דקה
    const interval = setInterval(loadReminderStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadReminderStatus = async () => {
    try {
      const reminders = await remindersAPI.getPending();
      setPendingCount(reminders.length);
      setRecentReminders(reminders.slice(0, 3)); // רק 3 האחרונות
    } catch (error) {
      console.error('שגיאה בטעינת סטטוס תזכורות:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-blue-600 text-white p-3 rounded-lg shadow-lg max-w-sm">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <span className="font-medium">
              {pendingCount} תזכורות ממתינות
            </span>
          </div>
          <span className="text-sm">
            {showDetails ? '▲' : '▼'}
          </span>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-blue-500">
            <div className="space-y-2">
              {recentReminders.map((reminder) => (
                <div key={reminder.id} className="text-sm">
                  <div className="font-medium">
                    {reminder.quotes?.[0]?.event_name || 'אירוע'}
                  </div>
                  <div className="text-blue-200">
                    {formatDate(reminder.reminder_date)}
                  </div>
                  {reminder.email_addresses && reminder.email_addresses.length > 0 && (
                    <div className="text-blue-200 text-xs">
                      📧 {reminder.email_addresses.length} מיילים
                    </div>
                  )}
                </div>
              ))}
              {pendingCount > 3 && (
                <div className="text-blue-200 text-xs">
                  +{pendingCount - 3} תזכורות נוספות
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReminderStatus;

