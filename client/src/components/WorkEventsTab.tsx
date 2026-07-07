import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock, MapPin, Trash2, Upload, Users } from 'lucide-react';
import type { Employee, EventSignup, WorkEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { employeesAPI, eventSignupsAPI, workEventsAPI } from '../services/supabaseAPI';
import { parseWorkEventsXlsx, ParsedEventRow } from '../utils/parseWorkEventsXlsx';

/** שורת תצוגה מקדימה: שורה מהקובץ + האם האירוע כבר קיים במערכת */
interface PreviewRow extends ParsedEventRow {
  existsInDb: boolean;
}

const parseIsoDate = (isoDate: string): Date | null => {
  const date = new Date(`${isoDate}T00:00:00`);
  return isNaN(date.getTime()) ? null : date;
};

const formatWeekday = (isoDate: string): string => {
  const date = parseIsoDate(isoDate);
  return date ? date.toLocaleDateString('he-IL', { weekday: 'long' }) : '';
};

const formatShortDate = (isoDate: string): string => {
  const date = parseIsoDate(isoDate);
  return date
    ? date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : isoDate;
};

const formatTime = (time: string | null): string | null => (time ? time.slice(0, 5) : null);

/** מפצל את מחרוזת תתי המתחמים לרשימת תגיות */
const splitSubVenues = (subVenues: string | null): string[] =>
  (subVenues ?? '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

const signupNames = (signups: EventSignup[]): string =>
  signups.map((s) => s.employees?.name || `עובד #${s.employee_id}`).join(', ');

export const WorkEventsTab: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [signups, setSignups] = useState<EventSignup[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyEventId, setBusyEventId] = useState<number | null>(null);

  // תצוגה מקדימה של קובץ שהועלה (אדמין)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [duplicatesInFile, setDuplicatesInFile] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [upcomingEvents, employee] = await Promise.all([
        workEventsAPI.getUpcoming(),
        employeesAPI.getCurrentUserEmployee(),
      ]);
      const eventSignups = await eventSignupsAPI.getByEvents(upcomingEvents.map((e) => e.id));
      setEvents(upcomingEvents);
      setSignups(eventSignups);
      setCurrentEmployee(employee);
    } catch (err) {
      console.error('Error loading work events:', err);
      setEvents([]);
      setSignups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const signupsByEvent = useMemo(() => {
    const map = new Map<number, EventSignup[]>();
    for (const signup of signups) {
      const list = map.get(signup.event_id) ?? [];
      list.push(signup);
      map.set(signup.event_id, list);
    }
    return map;
  }, [signups]);

  const isSignedUp = (eventId: number): boolean =>
    currentEmployee != null &&
    (signupsByEvent.get(eventId) ?? []).some((s) => s.employee_id === currentEmployee.id);

  // ----- הרשמה / ביטול הרשמה -----
  const handleToggleSignup = async (event: WorkEvent) => {
    if (!currentEmployee) return;
    try {
      setBusyEventId(event.id);
      if (isSignedUp(event.id)) {
        await eventSignupsAPI.cancel(event.id, currentEmployee.id);
      } else {
        await eventSignupsAPI.signUp(event.id, currentEmployee.id);
      }
      setSignups(await eventSignupsAPI.getByEvents(events.map((e) => e.id)));
    } catch (err) {
      console.error('Error toggling signup:', err);
      alert('שגיאה בעדכון ההרשמה, נסה שוב');
    } finally {
      setBusyEventId(null);
    }
  };

  // ----- מחיקת אירוע (אדמין) -----
  const handleDeleteEvent = async (event: WorkEvent) => {
    if (!window.confirm(`למחוק את האירוע "${event.event_name}" (${formatShortDate(event.event_date)})? ההרשמות אליו יימחקו גם כן.`)) {
      return;
    }
    try {
      setBusyEventId(event.id);
      await workEventsAPI.delete(event.id);
      await loadData();
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('שגיאה במחיקת האירוע');
    } finally {
      setBusyEventId(null);
    }
  };

  // ----- העלאת קובץ xlsx (אדמין) -----
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // מאפשר לבחור שוב את אותו קובץ
    if (!file) return;

    try {
      const result = await parseWorkEventsXlsx(file);
      if (result.fileErrors.length) {
        alert(result.fileErrors.join('\n'));
        return;
      }

      const validEvents = result.rows
        .filter((row) => row.event)
        .map((row) => ({ event_date: row.event!.event_date, event_name: row.event!.event_name }));
      const existingKeys = await workEventsAPI.findExisting(validEvents);

      setPreview(
        result.rows.map((row) => ({
          ...row,
          existsInDb: row.event ? existingKeys.has(`${row.event.event_date}|${row.event.event_name}`) : false,
        }))
      );
      setPreviewFileName(file.name);
      setDuplicatesInFile(result.duplicatesInFile);
    } catch (err) {
      console.error('Error parsing xlsx file:', err);
      alert('שגיאה בקריאת הקובץ. ודא שזהו קובץ xlsx תקין');
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    const eventsToImport = preview.filter((row) => row.event).map((row) => row.event!);
    if (!eventsToImport.length) {
      alert('אין שורות תקינות לייבוא');
      return;
    }
    try {
      setImporting(true);
      await workEventsAPI.upsertMany(eventsToImport);
      setPreview(null);
      setPreviewFileName('');
      setDuplicatesInFile(0);
      await loadData();
      alert(`${eventsToImport.length} אירועים נקלטו בהצלחה`);
    } catch (err) {
      console.error('Error importing events:', err);
      alert('שגיאה בייבוא האירועים');
    } finally {
      setImporting(false);
    }
  };

  const handleCancelImport = () => {
    setPreview(null);
    setPreviewFileName('');
    setDuplicatesInFile(0);
  };

  // ----- תגיות ורכיבי עזר לתצוגה -----
  const previewStatusBadge = (row: PreviewRow) => {
    if (row.errors.length) {
      return (
        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200">
          שגיאה: {row.errors.join(', ')}
        </span>
      );
    }
    if (row.existsInDb) {
      return (
        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
          קיים - יעודכן
        </span>
      );
    }
    return (
      <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200">
        חדש
      </span>
    );
  };

  const eventTypeBadge = (eventType: string | null) =>
    eventType ? (
      <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
        {eventType}
      </span>
    ) : (
      <span className="text-gray-400 dark:text-gray-500">---</span>
    );

  const subVenueBadges = (subVenues: string[]) => (
    <div className="flex flex-wrap gap-1.5">
      {subVenues.map((venue) => (
        <span
          key={venue}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
        >
          <MapPin className="w-3 h-3 text-gray-400 dark:text-gray-500" />
          {venue}
        </span>
      ))}
    </div>
  );

  const signupCountBadge = (count: number) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
        count
          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
      }`}
    >
      <Users className="w-3.5 h-3.5" />
      {count} נרשמו
    </span>
  );

  const signupButton = (event: WorkEvent, options?: { fullWidth?: boolean }) => {
    if (!currentEmployee) return null;
    const signedUp = isSignedUp(event.id);
    const busy = busyEventId === event.id;
    return (
      <button
        type="button"
        onClick={() => handleToggleSignup(event)}
        disabled={busy}
        className={`px-3.5 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 ${
          options?.fullWidth ? 'w-full' : ''
        } ${
          signedUp
            ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30'
            : 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white'
        }`}
      >
        {busy ? '...' : signedUp ? 'בטל הרשמה' : 'הירשם'}
      </button>
    );
  };

  const deleteButton = (event: WorkEvent) => {
    if (!isAdmin) return null;
    const busy = busyEventId === event.id;
    return (
      <button
        type="button"
        onClick={() => handleDeleteEvent(event)}
        disabled={busy}
        title="מחק אירוע"
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  };

  // הערה: App.css מגדיר רקע גלובלי לבן ל-table/th/tr:hover, לכן חובה
  // רקע מפורש (כולל dark:) על כל th/td כדי שמצב כהה יעבוד כאן.
  const thClass = 'px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
  const tdClass = 'px-4 py-4 text-right text-sm text-gray-800 dark:text-gray-200 align-middle bg-white dark:bg-gray-900 group-hover:bg-blue-50/60 dark:group-hover:bg-gray-800/70 transition-colors border-b border-gray-100 dark:border-gray-800';

  return (
    <div className="p-4 sm:p-6">
      {/* כותרת + כפתור העלאה */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">אירועים קרובים</h2>
          {!loading && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {events.length ? `${events.length} אירועים פתוחים להרשמה` : 'אין אירועים פתוחים כרגע'}
            </p>
          )}
        </div>

        {isAdmin && !preview && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              העלאת קובץ אירועים (xlsx)
            </button>
          </>
        )}
      </div>

      {/* תצוגה מקדימה לפני ייבוא */}
      {isAdmin && preview && (
        <div className="mb-8 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-all">
              תצוגה מקדימה: {previewFileName}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {preview.filter((r) => r.event && !r.existsInDb).length} חדשים,{' '}
              {preview.filter((r) => r.event && r.existsInDb).length} קיימים (יעודכנו),{' '}
              {preview.filter((r) => r.errors.length).length} שגויים (ידולגו)
              {duplicatesInFile > 0 && `, ${duplicatesInFile} כפילויות בקובץ הוסרו`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full mt-0 shadow-none">
              <thead>
                <tr>
                  <th className={thClass}>שורה</th>
                  <th className={thClass}>תאריך</th>
                  <th className={thClass}>שם האירוע</th>
                  <th className={thClass}>סוג</th>
                  <th className={thClass}>תתי מתחמים</th>
                  <th className={thClass}>שעת התחלה</th>
                  <th className={thClass}>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.rowNumber} className={`group ${row.errors.length ? 'opacity-60' : ''}`}>
                    <td className={tdClass}>{row.rowNumber}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{row.event ? formatShortDate(row.event.event_date) : '---'}</td>
                    <td className={`${tdClass} font-medium`}>{row.event?.event_name ?? '---'}</td>
                    <td className={tdClass}>{row.event?.event_type ?? '---'}</td>
                    <td className={tdClass}>{row.event?.sub_venues ?? '---'}</td>
                    <td className={tdClass}>{row.event ? formatTime(row.event.start_time) ?? '---' : '---'}</td>
                    <td className={tdClass}>{previewStatusBadge(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 sm:px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={importing}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {importing ? 'מייבא...' : 'אישור וייבוא'}
            </button>
            <button
              type="button"
              onClick={handleCancelImport}
              disabled={importing}
              className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* הודעה לעובד שאין לו רשומת עובד */}
      {!isAdmin && !loading && !currentEmployee && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-sm">
          לא נמצאה רשומת עובד המשויכת למשתמש שלך, לכן לא ניתן להירשם לאירועים. פנה למנהל המערכת.
        </div>
      )}

      {/* מצבי טעינה וריק */}
      {loading && (
        <div className="p-10 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-gray-600 dark:text-gray-300">
          טוען אירועים...
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="p-12 border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
          <CalendarDays className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500" />
          <p className="mt-3 font-medium text-gray-700 dark:text-gray-300">אין אירועים קרובים להצגה</p>
          {isAdmin && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              העלה קובץ xlsx כדי להוסיף אירועים חדשים
            </p>
          )}
        </div>
      )}

      {/* תצוגת כרטיסים - מובייל */}
      {!loading && events.length > 0 && (
        <div className="md:hidden space-y-3">
          {events.map((event) => {
            const eventSignups = signupsByEvent.get(event.id) ?? [];
            const signedUp = isSignedUp(event.id);
            const subVenues = splitSubVenues(event.sub_venues);
            const startTime = formatTime(event.start_time);

            return (
              <div
                key={event.id}
                className={`rounded-xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden ${
                  signedUp
                    ? 'border-green-300 dark:border-green-800'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white leading-snug">
                        {event.event_name}
                      </h3>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {formatWeekday(event.event_date)}, {formatShortDate(event.event_date)}
                      </p>
                    </div>
                    {eventTypeBadge(event.event_type)}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {startTime && (
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        {startTime}
                      </span>
                    )}
                    {signupCountBadge(eventSignups.length)}
                    {!isAdmin && signedUp && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200">
                        אתה רשום
                      </span>
                    )}
                  </div>

                  {subVenues.length > 0 && <div className="mt-3">{subVenueBadges(subVenues)}</div>}

                  {isAdmin && eventSignups.length > 0 && (
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      נרשמו: {signupNames(eventSignups)}
                    </p>
                  )}
                </div>

                {(currentEmployee || isAdmin) && (
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                    <div className="flex-1">{signupButton(event, { fullWidth: true })}</div>
                    {deleteButton(event)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* טבלת האירועים - דסקטופ */}
      {!loading && events.length > 0 && (
        <div className="hidden md:block border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full mt-0 shadow-none">
              <thead>
                <tr>
                  <th className={thClass}>תאריך</th>
                  <th className={thClass}>שם האירוע</th>
                  <th className={thClass}>סוג אירוע</th>
                  <th className={thClass}>תתי מתחמים</th>
                  <th className={thClass}>שעת התחלה</th>
                  <th className={thClass}>נרשמים</th>
                  <th className={thClass}>{isAdmin ? 'פעולות' : 'הרשמה'}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const eventSignups = signupsByEvent.get(event.id) ?? [];
                  const signedUp = isSignedUp(event.id);
                  const subVenues = splitSubVenues(event.sub_venues);
                  const startTime = formatTime(event.start_time);

                  return (
                    <tr key={event.id} className="group">
                      {/* תאריך: יום בשבוע מעל התאריך */}
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatWeekday(event.event_date)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatShortDate(event.event_date)}
                        </div>
                      </td>

                      <td className={`${tdClass} font-semibold text-gray-900 dark:text-white`}>
                        {event.event_name}
                      </td>

                      <td className={tdClass}>{eventTypeBadge(event.event_type)}</td>

                      <td className={tdClass}>
                        {subVenues.length ? (
                          subVenueBadges(subVenues)
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">---</span>
                        )}
                      </td>

                      <td className={`${tdClass} whitespace-nowrap`}>
                        {startTime ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            {startTime}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">---</span>
                        )}
                      </td>

                      <td className={tdClass}>
                        <div className="flex flex-col items-start gap-1.5">
                          {signupCountBadge(eventSignups.length)}
                          {isAdmin && eventSignups.length > 0 && (
                            <span
                              className="text-xs text-gray-500 dark:text-gray-400 max-w-[16rem] truncate"
                              title={signupNames(eventSignups)}
                            >
                              {signupNames(eventSignups)}
                            </span>
                          )}
                          {!isAdmin && signedUp && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200">
                              אתה רשום
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={`${tdClass} whitespace-nowrap`}>
                        <div className="flex items-center gap-2">
                          {signupButton(event)}
                          {deleteButton(event)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
