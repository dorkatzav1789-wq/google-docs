import React, { useEffect, useMemo, useState } from 'react';
import { Quote } from '../types';
import { quotesAPI, remindersAPI } from '../services/supabaseAPI';

interface QuotesListProps {
  onQuoteSelect: (quoteId: number) => void;
  compact?: boolean; // אם true, מציג גרסה קומפקטית בלי min-h-screen
}

type GroupedQuotes = Record<string, Quote[]>;
type QuoteStatus = 'initial' | 'negotiation' | 'reserved' | 'signed';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  initial: 'ראשוני',
  negotiation: 'מתנהל משא ומתן',
  reserved: 'משוריין',
  signed: 'חתום',
};

const STATUS_BADGE_CLASSES: Record<QuoteStatus, string> = {
  initial: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  negotiation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  reserved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  signed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

const getQuoteStatus = (quote: Quote): QuoteStatus => {
  const status = quote.quote_status as QuoteStatus | undefined;
  if (status === 'negotiation' || status === 'reserved' || status === 'signed') return status;
  return 'initial';
};

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
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all');

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
    const term = searchTerm.toLowerCase().trim();
    return quotes.filter(quote => {
      const quoteStatus = (quote.quote_status as QuoteStatus) || 'initial';
      const matchesSearch = !term || (
      quote.event_name?.toLowerCase().includes(term) ||
      quote.client_name?.toLowerCase().includes(term) ||
      quote.client_company?.toLowerCase().includes(term)
      );
      const matchesStatus = statusFilter === 'all' || quoteStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchTerm, statusFilter]);

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
        <div className={`${compact ? 'px-0 pt-0' : 'px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6'} mb-6`}>
          {!compact && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 shadow-sm p-3 sm:p-4 md:p-5 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-2">הצעות קיימות</h1>
              <p className="text-black/80 dark:text-white/80">ניהול הצעות מחיר לפי תאריך האירוע</p>
            </div>
          )}
          
          {/* שדה חיפוש */}
          <div className="max-w-3xl mx-auto mt-3 sm:mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-2 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חפש לפי שם אירוע, לקוח או חברה..."
              className="min-w-0 flex-1 h-10 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | QuoteStatus)}
              className="w-full sm:w-44 h-10 shrink-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              title="סינון לפי סטטוס"
              aria-label="סינון לפי סטטוס"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="initial">{STATUS_LABELS.initial}</option>
              <option value="negotiation">{STATUS_LABELS.negotiation}</option>
              <option value="reserved">{STATUS_LABELS.reserved}</option>
              <option value="signed">{STATUS_LABELS.signed}</option>
            </select>
          </div>
          <div className="max-w-3xl mx-auto mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              סה"כ הצעות: {quotes.length}
            </span>
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              תוצאות סינון: {filteredQuotes.length}
            </span>
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
            <div className={`space-y-4 sm:space-y-6 ${compact ? 'px-0 pb-0' : 'px-3 sm:px-4 md:px-6 pb-6'}`}>
              {days.map((dayKey) => (
                  <div key={dayKey} className="card rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        {dayKey === 'ללא תאריך אירוע' ? dayKey : formatHebDate(dayKey)}
                      </h3>
                      <span className="text-xs sm:text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        {groupedQuotes[dayKey].length} הצעות
                      </span>
                    </div>

                    <div className="space-y-3">
                      {groupedQuotes[dayKey].map((quote) => (
                          <div
                              key={quote.id}
                              className="border border-gray-200/90 dark:border-gray-700 rounded-2xl p-3 sm:p-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                              {/* פרטי ההצעה – לחיצה פותחת פרטים */}
                              <div
                                  className="flex-1 cursor-pointer"
                                  onClick={() => onQuoteSelect(quote.id!)}
                              >
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <h4 className="font-semibold text-gray-900 dark:text-white break-words text-base sm:text-lg">
                                    {quote.event_name}
                                  </h4>
                                  <span className={`px-2.5 py-1 text-[11px] rounded-full font-medium ${STATUS_BADGE_CLASSES[getQuoteStatus(quote)]}`}>
                                    {STATUS_LABELS[getQuoteStatus(quote)]}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                  <div className="leading-relaxed">
                                    <span className="font-medium text-gray-700 dark:text-gray-200">לקוח:</span> {quote.client_name}
                                    {quote.client_company && ` - ${quote.client_company}`}
                                  </div>
                                  {quote.event_hours && (
                                      <div className="leading-relaxed">
                                        <span className="font-medium text-gray-700 dark:text-gray-200">שעות:</span> {quote.event_hours}
                                      </div>
                                  )}
                                  {quote.special_notes && (
                                      <div className="leading-relaxed">
                                        <span className="font-medium text-gray-700 dark:text-gray-200">הערות:</span> {quote.special_notes}
                                      </div>
                                  )}
                                  {reminders[quote.id!] && (
                                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-300">
                                        <span>🔔</span>
                                        <span className="font-medium text-xs">תזכורת פעילה</span>
                                      </div>
                                  )}
                                </div>
                              </div>

                              {/* סכום + תאריך יצירה + מחיקה */}
                              <div className="text-left sm:ml-4 flex flex-col items-start sm:items-end gap-2 min-w-[150px] w-full sm:w-auto">
                                <div className="px-3 py-1.5 rounded-xl bg-emerald-50/80 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 text-base sm:text-lg font-bold">
                                  {formatCurrency(quote.final_total!)}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  נוצר:{' '}
                                  {quote.created_at
                                      ? new Date(quote.created_at).toLocaleDateString('he-IL')
                                      : 'לא ידוע'}
                                </div>
                                <button
                                  onClick={() => onQuoteSelect(quote.id!)}
                                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors text-xs font-medium"
                                >
                                  פתח פרטים
                                </button>

                                <button
                                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-red-600 border border-red-200 bg-white hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:border-red-900/30 dark:bg-gray-800 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-colors text-xs font-medium"
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
