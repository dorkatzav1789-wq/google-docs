import React, { useState, useEffect, useCallback } from 'react';
import { Reminder, NewReminderInput } from '../types';
import { remindersAPI } from '../services/supabaseAPI';

interface ReminderManagerProps {
  quoteId: number;
  eventDate: string;
  eventName: string;
  onClose: () => void;
}

const ReminderManager: React.FC<ReminderManagerProps> = ({ 
  quoteId, 
  eventDate, 
  eventName, 
  onClose 
}) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState<Partial<NewReminderInput>>({
    quote_id: quoteId,
    reminder_type: 'email',
    email_addresses: [],
    message: ''
  });
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const loadReminders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await remindersAPI.getByQuote(quoteId);
      setReminders(data);
    } catch (error) {
      console.error('שגיאה בטעינת תזכורות:', error);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleCreateAutoReminder = async () => {
    try {
      await remindersAPI.createAuto(quoteId);
      await loadReminders();
      alert('תזכורת אוטומטית נוצרה בהצלחה!');
    } catch (error) {
      console.error('שגיאה ביצירת תזכורת אוטומטית:', error);
      alert('שגיאה ביצירת תזכורת אוטומטית');
    }
  };

  const handleAddEmail = () => {
    if (emailInput.trim() && !newReminder.email_addresses?.includes(emailInput.trim())) {
      setNewReminder(prev => ({
        ...prev,
        email_addresses: [...(prev.email_addresses || []), emailInput.trim()]
      }));
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setNewReminder(prev => ({
      ...prev,
      email_addresses: prev.email_addresses?.filter(e => e !== email) || []
    }));
  };

  const updateReminderDateTime = (date: string, time: string) => {
    if (date && time) {
      const dateTime = new Date(`${date}T${time}`);
      setNewReminder(prev => ({
        ...prev,
        reminder_date: dateTime.toISOString()
      }));
    }
  };

  const handleCreateReminder = async () => {
    try {
      if (!dateInput || !timeInput || !newReminder.reminder_type) {
        alert('יש למלא את כל השדות הנדרשים - תאריך, שעה וסוג התזכורת');
        return;
      }

      await remindersAPI.create(newReminder as NewReminderInput);
      await loadReminders();
      setShowAddForm(false);
      setNewReminder({
        quote_id: quoteId,
        reminder_type: 'email',
        email_addresses: [],
        message: ''
      });
      setDateInput('');
      setTimeInput('');
      setDateInput('');
      setTimeInput('');
      alert('תזכורת נוצרה בהצלחה!');
    } catch (error) {
      console.error('שגיאה ביצירת תזכורת:', error);
      alert('שגיאה ביצירת תזכורת');
    }
  };

  const handleDeleteReminder = async (id: number) => {
    if (!window.confirm('האם למחוק את התזכורת?')) return;

    try {
      await remindersAPI.delete(id);
      await loadReminders();
      alert('תזכורת נמחקה בהצלחה!');
    } catch (error) {
      console.error('שגיאה במחיקת תזכורת:', error);
      alert('שגיאה במחיקת תזכורת');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-center">טוען תזכורות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">ניהול תזכורות</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">פרטי האירוע</h3>
          <p><strong>שם האירוע:</strong> {eventName}</p>
          <p><strong>תאריך האירוע:</strong> {formatDate(eventDate)}</p>
        </div>

        <div className="mb-4">
          <button
            onClick={handleCreateAutoReminder}
            className="btn-primary mr-2"
          >
            📅 צור תזכורת אוטומטית (72 שעות לפני)
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-secondary"
          >
            ➕ הוסף תזכורת מותאמת
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 border border-gray-300 rounded-lg">
            <h3 className="font-semibold mb-4">תזכורת חדשה</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תאריך התזכורת
                </label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => {
                    setDateInput(e.target.value);
                    updateReminderDateTime(e.target.value, timeInput);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  aria-label="תאריך התזכורת"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שעה
                </label>
                <input
                  type="time"
                  value={timeInput}
                  onChange={(e) => {
                    setTimeInput(e.target.value);
                    updateReminderDateTime(dateInput, e.target.value);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  aria-label="שעת התזכורת"
                  step="300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סוג התזכורת
                </label>
                <select
                  value={newReminder.reminder_type || 'email'}
                  onChange={(e) => setNewReminder(prev => ({
                    ...prev,
                    reminder_type: e.target.value as 'email' | 'sms' | 'push'
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  aria-label="סוג התזכורת"
                >
                  <option value="email">מייל</option>
                  <option value="sms">SMS</option>
                  <option value="push">התראה</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                כתובות מייל
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="הזן כתובת מייל"
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                />
                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="btn-secondary"
                >
                  הוסף
                </button>
              </div>
              {newReminder.email_addresses && newReminder.email_addresses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newReminder.email_addresses.map((email, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הודעה מותאמת (אופציונלי)
              </label>
              <textarea
                value={newReminder.message || ''}
                onChange={(e) => setNewReminder(prev => ({
                  ...prev,
                  message: e.target.value
                }))}
                placeholder="הזן הודעה מותאמת או השאר ריק לתזכורת סטנדרטית"
                className="w-full p-2 border border-gray-300 rounded-md h-20"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateReminder}
                className="btn-primary"
              >
                צור תזכורת
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-4">תזכורות קיימות</h3>
          {reminders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">אין תזכורות עבור הצעה זו</p>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {formatDate(reminder.reminder_date)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          reminder.is_sent 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {reminder.is_sent ? 'נשלח' : 'ממתין'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {reminder.reminder_type}
                        </span>
                      </div>
                      
                      {reminder.email_addresses && reminder.email_addresses.length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">מיילים: </span>
                          <span className="text-sm">
                            {reminder.email_addresses.join(', ')}
                          </span>
                        </div>
                      )}
                      
                      {reminder.message && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">הודעה: </span>
                          <span className="text-sm">{reminder.message}</span>
                        </div>
                      )}
                      
                      {reminder.sent_at && (
                        <div className="text-xs text-gray-500">
                          נשלח ב: {formatDate(reminder.sent_at)}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeleteReminder(reminder.id!)}
                      className="text-red-600 hover:text-red-800 ml-4"
                      title="מחק תזכורת"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReminderManager;
