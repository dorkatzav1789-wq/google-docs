import React, { useEffect, useMemo, useState } from 'react';
import { Quote } from '../types';
import { quotesAPI, remindersAPI } from '../services/supabaseAPI';

interface QuotesListProps {
  onQuoteSelect: (quoteId: number) => void;
  compact?: boolean; // אם true, מציג גרסה קומפקטית בלי min-h-screen
}

type GroupedQuotes = Record<string, Quote[]>;

const formatHebDate = (isoDateLike: string) => {
  const d = new Date(isoDateLike);
  if (isNaN(d.getTime())) return isoDateLike;
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatCurrency = (amount: number) => `₪${amount.toLocaleString()}`;

const QuotesList: React.FC<QuotesListProps> = ({ onQuoteSelect, compact = false }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await quotesAPI.getAll();
      setQuotes(data);
    } catch (error) {
      console.error('שגיאה בטעינת הצעות:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    try {
      const data = await remindersAPI.getAll();
      const reminderMap: Record<number, boolean> = {};
      data.forEach(reminder => {
        if (reminder.quote_id) {
          reminderMap[reminder.quote_id] = true;
        }
      });
      setReminders(reminderMap);
    } catch (error) {
      console.error('שגיאה בטעינת תזכורות:', error);
    }
  };

  useEffect(() => {
    loadQuotes();
    loadReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // סינון לפי חיפוש
  const filteredQuotes = useMemo(() => {
    if (!searchTerm.trim()) return quotes;
    const term = searchTerm.toLowerCase();
    return quotes.filter(quote => 
      quote.event_name?.toLowerCase().includes(term) ||
      quote.client_name?.toLowerCase().includes(term) ||
      quote.client_company?.toLowerCase().includes(term)
    );
  }, [quotes, searchTerm]);

  // קיבוץ לפי תאריך אירוע
  const groupedQuotes: GroupedQuotes = useMemo(() => {
    const grouped: GroupedQuotes = {};
    for (const q of filteredQuotes) {
      const key = q.event_date || 'ללא תאריך אירוע';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(q);
    }
    // מיון פנימי בכל יום מהחדש לישן לפי created_at
    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    });
    return grouped;
  }, [filteredQuotes]);

  // רשימת ימים (קבוצות) ממוינת לפי תאריך האירוע
  const days = useMemo(() => {
    const keys = Object.keys(groupedQuotes);
    return keys.sort((a, b) => {
      if (a === 'ללא תאריך אירוע') return 1;
      if (b === 'ללא תאריך אירוע') return -1;
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [groupedQuotes]);

  if (loading) {
    return (
        <div className="w-full mx-auto p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-white">טוען הצעות...</p>
          </div>
        </div>
    );
  }

  return (
      <div className={`w-full mx-auto ${compact ? '' : 'bg-gray-50 dark:bg-gray-900 min-h-screen'}`}>
        <div className={`text-center mb-8 ${compact ? 'px-0 pt-0' : 'px-6 pt-6'}`}>
          {!compact && (
            <>
              <h1 className="text-3xl font-bold text-black dark:text-white mb-2">הצעות קיימות</h1>
              <p className="text-black/80 dark:text-white/80 mb-4">ניהול הצעות מחיר לפי תאריך האירוע</p>
            </>
          )}
          
          {/* שדה חיפוש */}
          <div className="max-w-md mx-auto mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חפש לפי שם אירוע, לקוח או חברה..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
        </div>

        {quotes.length === 0 ? (
            <div className="text-center">
              <div className="card max-w-md mx-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">אין הצעות עדיין</h3>
                <p className="text-gray-600 dark:text-gray-400">צור הצעת מחיר ראשונה כדי להתחיל</p>
              </div>
            </div>
        ) : filteredQuotes.length === 0 ? (
            <div className="text-center px-6">
              <div className="card max-w-md mx-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">לא נמצאו הצעות</h3>
                <p className="text-gray-600 dark:text-gray-400">נסה לשנות את מונח החיפוש</p>
              </div>
            </div>
        ) : (
            <div className={`space-y-6 ${compact ? 'px-0 pb-0' : 'px-6 pb-6'}`}>
              {days.map((dayKey) => (
                  <div key={dayKey} className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {dayKey === 'ללא תאריך אירוע' ? dayKey : formatHebDate(dayKey)}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                  {groupedQuotes[dayKey].length} הצעות
                </span>
                    </div>

                    <div className="space-y-3">
                      {groupedQuotes[dayKey].map((quote) => (
                          <div
                              key={quote.id}
                              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800"
                          >
                            <div className="flex justify-between items-start">
                              {/* פרטי ההצעה – לחיצה פותחת פרטים */}
                              <div
                                  className="flex-1 cursor-pointer"
                                  onClick={() => onQuoteSelect(quote.id!)}
                              >
                                <h4 className="font-semibold text-gray-800 dark:text-white mb-1">
                                  {quote.event_name}
                                </h4>
                                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                  <div>
                                    <span className="font-medium">לקוח:</span> {quote.client_name}
                                    {quote.client_company && ` - ${quote.client_company}`}
                                  </div>
                                  {quote.event_hours && (
                                      <div>
                                        <span className="font-medium">שעות:</span> {quote.event_hours}
                                      </div>
                                  )}
                                  {quote.special_notes && (
                                      <div>
                                        <span className="font-medium">הערות:</span> {quote.special_notes}
                                      </div>
                                  )}
                                  {reminders[quote.id!] && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-blue-600">🔔</span>
                                        <span className="text-blue-600 font-medium">תזכורת פעילה</span>
                                      </div>
                                  )}
                                </div>
                              </div>

                              {/* סכום + תאריך יצירה + מחיקה */}
                              <div className="text-left ml-4 flex flex-col items-end gap-2">
                                <div className="text-lg font-bold text-green-600">
                                  {formatCurrency(quote.final_total!)}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  נוצר:{' '}
                                  {quote.created_at
                                      ? new Date(quote.created_at).toLocaleDateString('he-IL')
                                      : 'לא ידוע'}
                                </div>

                                <button
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    title="מחיקת הצעה"
                                    aria-label="מחיקת הצעה"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const ok = window.confirm('למחוק את ההצעה הזו? הפעולה בלתי הפיכה.');
                                      if (!ok) return;
                                      try {
                                        await quotesAPI.remove(quote.id!);
                                        setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
                                      } catch (err) {
                                        console.error('שגיאה במחיקת ההצעה:', err);
                                        alert('שגיאה במחיקת ההצעה');
                                      }
                                    }}
                                >
                                  🗑️ מחיקה
                                </button>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
              ))}
            </div>
        )}
      </div>
  );
};

export default QuotesList;
