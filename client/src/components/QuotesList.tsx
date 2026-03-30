import React, { useEffect, useMemo, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Quote } from '../types';
import { quotesAPI, remindersAPI, quoteExpensesAPI } from '../services/supabaseAPI';

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

/** שמות חודשים בעברית (ל־select — תואם גם לדפדפנים בלי input[type=month]) */
const HEB_MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString('he-IL', { month: 'long' })
);

const QuotesList: React.FC<QuotesListProps> = ({ onQuoteSelect, compact = false }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all');
  const [exportYear, setExportYear] = useState(() => new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(() => new Date().getMonth() + 1);
  const [exportBusy, setExportBusy] = useState(false);

  const y0 = new Date().getFullYear();
  const exportYearChoices = Array.from({ length: 9 }, (_, i) => y0 - 5 + i);

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

  const exportSignedMonthPdf = async () => {
    const year = exportYear;
    const month = exportMonth;
    const mStr = String(month).padStart(2, '0');
    if (!year || month < 1 || month > 12) return;

    const escHtml = (s: string | number | null | undefined) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const fmtMoney = (n: number) =>
      `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;

    const th =
      'border:1px solid #111;padding:6px 8px;text-align:right;font-size:11px;background:#f3f4f6;font-weight:bold;';
    const td = 'border:1px solid #111;padding:6px 8px;text-align:right;font-size:10px;vertical-align:top;';

    try {
      setExportBusy(true);
      const signed = await quotesAPI.getSignedByEventMonth(year, month);
      if (!signed.length) {
        alert('אין הצעות חתומות עם תאריך אירוע בחודש שנבחר.');
        return;
      }
      const ids = signed.map((q) => q.id).filter((id): id is number => id != null);
      const expenseSums = await quoteExpensesAPI.sumAmountsByQuoteIds(ids);

      const income = (q: Quote) => Number(q.final_total ?? 0);
      const expensesFor = (q: Quote) => expenseSums[q.id!] ?? 0;

      let totalIncome = 0;
      let totalExpenses = 0;

      const bodyRows = signed
        .map((q) => {
          const inc = income(q);
          const exp = expensesFor(q);
          const net = inc - exp;
          totalIncome += inc;
          totalExpenses += exp;
          const eventDateStr = q.event_date
            ? formatHebDate(q.event_date)
            : '';
          return `<tr>
            <td style="${td}">${escHtml(q.id)}</td>
            <td style="${td}">${escHtml(eventDateStr)}</td>
            <td style="${td}">${escHtml(q.event_name)}</td>
            <td style="${td}">${escHtml(q.client_name)}</td>
            <td style="${td}">${escHtml(q.client_company)}</td>
            <td style="${td}">${escHtml(fmtMoney(inc))}</td>
            <td style="${td}">${escHtml(fmtMoney(exp))}</td>
            <td style="${td}">${escHtml(fmtMoney(net))}</td>
          </tr>`;
        })
        .join('');

      const periodLabel = new Date(year, month - 1, 1).toLocaleDateString('he-IL', {
        month: 'long',
        year: 'numeric',
      });

      const html = `
        <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:12px;box-sizing:border-box;">
          <h1 style="font-size:18px;margin:0 0 4px 0;">דוח הצעות חתומות</h1>
          <p style="font-size:12px;margin:0 0 12px 0;color:#374151;">לפי תאריך אירוע: ${escHtml(periodLabel)}</p>
          <p style="font-size:10px;margin:0 0 16px 0;color:#6b7280;line-height:1.4;">
         
          </p>
          <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <colgroup>
              <col style="width:6%" /><col style="width:12%" /><col style="width:18%" />
              <col style="width:14%" /><col style="width:14%" /><col style="width:12%" />
              <col style="width:12%" /><col style="width:12%" />
            </colgroup>
            <thead>
              <tr>
                <th style="${th}">מזהה</th>
                <th style="${th}">תאריך אירוע</th>
                <th style="${th}">שם אירוע</th>
                <th style="${th}">לקוח</th>
                <th style="${th}">חברה</th>
                <th style="${th}">הכנסה</th>
                <th style="${th}">הוצאות</th>
                <th style="${th}">נטו</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
              <tr style="background:#d1fae5;font-weight:bold;">
                <td colspan="5" style="${td}">סיכום חודש</td>
                <td style="${td}">${escHtml(fmtMoney(totalIncome))}</td>
                <td style="${td}">${escHtml(fmtMoney(totalExpenses))}</td>
                <td style="${td}">${escHtml(fmtMoney(totalIncome - totalExpenses))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      // html2canvas רגיש לסגנונות אב בדף (Tailwind / dark / transform). מסמך iframe נקי
      // מבודד את הדוח ומונע PDF לבן שמתקבל לעיתים כשמציירים אלמנט מתוך ה-React root.
      let iframe: HTMLIFrameElement | null = null;
      try {
        iframe = document.createElement('iframe');
        iframe.setAttribute('title', 'ייצוא PDF');
        Object.assign(iframe.style, {
          position: 'fixed',
          inset: '0',
          width: '100%',
          height: '100%',
          zIndex: '2147483646',
          border: 'none',
          background: '#ffffff',
        });
        document.body.appendChild(iframe);

        const idoc = iframe.contentDocument;
        if (!idoc) throw new Error('iframe document unavailable');

        idoc.open();
        idoc.write(
          `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 12px; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; }
          </style></head><body>${html}</body></html>`
        );
        idoc.close();

        const root = idoc.body.firstElementChild as HTMLElement | null;
        if (!root) throw new Error('export root missing');

        await Promise.resolve();
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        void root.offsetHeight;
        await new Promise<void>((r) => setTimeout(r, 80));

        const opt = {
          margin: [8, 8, 8, 8],
          filename: `signed-events-${year}-${mStr}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
          pagebreak: { mode: ['css', 'legacy'] as const },
        };

        await html2pdf().set(opt).from(root).save();
      } finally {
        iframe?.remove();
      }
    } catch (err) {
      console.error('שגיאה בייצוא דוח חודשי ל-PDF:', err);
      alert('שגיאה בייצוא הדוח ל-PDF. נסה שוב.');
    } finally {
      setExportBusy(false);
    }
  };

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

          <div className="max-w-3xl mx-auto mt-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">דוח חודשי (חתום)</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={exportMonth}
                onChange={(e) => setExportMonth(Number(e.target.value))}
                className="h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white !w-auto min-w-[9rem]"
                title="חודש לדוח"
                aria-label="חודש לדוח"
              >
                {HEB_MONTH_LABELS.map((label, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={exportYear}
                onChange={(e) => setExportYear(Number(e.target.value))}
                className="h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white !w-auto min-w-[5.5rem]"
                title="שנה לדוח"
                aria-label="שנה לדוח"
              >
                {exportYearChoices.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={exportBusy}
                onClick={() => void exportSignedMonthPdf()}
                className="h-10 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-sm font-medium whitespace-nowrap"
              >
                {exportBusy ? 'מייצא…' : 'ייצא PDF'}
              </button>
            </div>
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
