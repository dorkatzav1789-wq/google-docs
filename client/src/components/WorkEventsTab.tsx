import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock, List, MapPin, Plus, Trash2, Upload, Users } from 'lucide-react';
import type { Employee, EventSignup, WorkEvent } from '../types';
import { useAuth } from '../context/AuthContext';
import { employeesAPI, eventSignupsAPI, workEventsAPI } from '../services/supabaseAPI';
import { parseWorkEventsXlsx, ParsedEventRow } from '../utils/parseWorkEventsXlsx';
import {
  EVENT_CATEGORY_ALLOWED_LABEL,
  EVENT_SOURCE_LABEL,
  classifyEventForRoles,
  eventIdentityKey,
  formatShortDate,
  formatTime,
  formatWeekday,
  getMonthRange,
  isEarlyStart,
  isEmployeeEligible,
  resolveEventVisual,
  splitSubVenues,
  toIsoDate,
} from '../utils/workEventHelpers';
import { WorkEventsCalendar } from './WorkEventsCalendar';
import { WorkEventForm } from './WorkEventForm';

interface PreviewRow extends ParsedEventRow {
  existsInDb: boolean;
}

type ViewMode = 'calendar' | 'list';

const signupNames = (signups: EventSignup[]): string =>
  signups.map((s) => s.employees?.name || `עובד #${s.employee_id}`).join(', ');

export const WorkEventsTab: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(toIsoDate(now));
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [signups, setSignups] = useState<EventSignup[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyEventId, setBusyEventId] = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [duplicatesInFile, setDuplicatesInFile] = useState(0);
  const [importing, setImporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getMonthRange(viewYear, viewMonth);
      const [monthEvents, employee] = await Promise.all([
        workEventsAPI.getInRange(from, to),
        employeesAPI.getCurrentUserEmployee(),
      ]);
      const eventSignups = await eventSignupsAPI.getByEvents(monthEvents.map((e) => e.id));
      setEvents(monthEvents);
      setSignups(eventSignups);
      setCurrentEmployee(employee);
    } catch (err) {
      console.error('Error loading work events:', err);
      setEvents([]);
      setSignups([]);
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth]);

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

  const signedUpEventIds = useMemo(() => {
    if (!currentEmployee) return new Set<number>();
    const ids = new Set<number>();
    for (const signup of signups) {
      if (signup.employee_id === currentEmployee.id) ids.add(signup.event_id);
    }
    return ids;
  }, [signups, currentEmployee]);

  const isSignedUp = (eventId: number): boolean => signedUpEventIds.has(eventId);

  /** האם העובד הנוכחי רשאי להירשם לאירוע (לפי תפקידיו וסיווג האירוע) */
  const isEligibleForEvent = useCallback(
    (event: WorkEvent): boolean =>
      currentEmployee != null &&
      isEmployeeEligible(currentEmployee.job_title, classifyEventForRoles(event)),
    [currentEmployee]
  );

  const isEventFull = (event: WorkEvent): boolean =>
    event.needed_employees != null &&
    (signupsByEvent.get(event.id)?.length ?? 0) >= event.needed_employees;

  const [onlyMyRoleEvents, setOnlyMyRoleEvents] = useState(false);

  const visibleEvents = useMemo(() => {
    if (!onlyMyRoleEvents || !currentEmployee) return events;
    return events.filter(isEligibleForEvent);
  }, [events, onlyMyRoleEvents, currentEmployee, isEligibleForEvent]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return visibleEvents;
    return visibleEvents.filter((event) => event.event_date === selectedDate);
  }, [visibleEvents, selectedDate]);

  const displayedEvents = viewMode === 'calendar' && selectedDate ? selectedDayEvents : visibleEvents;

  const handleMonthChange = (year: number, month: number) => {
    setViewYear(year);
    setViewMonth(month);
  };

  const handleToggleSignup = async (event: WorkEvent) => {
    if (!currentEmployee) return;
    const signedUp = isSignedUp(event.id);
    if (!signedUp && (!isEligibleForEvent(event) || isEventFull(event))) return;
    try {
      setBusyEventId(event.id);
      if (signedUp) {
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

  const handleDeleteAll = async () => {
    if (!events.length) return;
    if (!window.confirm(`למחוק את כל ${events.length} האירועים בחודש זה? כל ההרשמות אליהם יימחקו גם כן. פעולה זו אינה הפיכה.`)) {
      return;
    }
    try {
      setDeletingAll(true);
      await workEventsAPI.deleteMany(events.map((e) => e.id));
      await loadData();
    } catch (err) {
      console.error('Error deleting all events:', err);
      alert('שגיאה במחיקת האירועים');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const result = await parseWorkEventsXlsx(file);
      if (result.fileErrors.length && !result.rows.length) {
        alert(result.fileErrors.join('\n'));
        return;
      }
      if (result.fileErrors.length) {
        alert(`חלק מהגיליונות דולגו:\n${result.fileErrors.join('\n')}`);
      }

      const validEvents = result.rows
        .filter((row) => row.event)
        .map((row) => ({
          event_date: row.event!.event_date,
          event_name: row.event!.event_name,
          source: row.event!.source,
        }));
      const existingKeys = await workEventsAPI.findExisting(validEvents);

      setPreview(
        result.rows.map((row) => ({
          ...row,
          existsInDb: row.event ? existingKeys.has(eventIdentityKey(row.event)) : false,
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

  const sourceBadge = (source: WorkEvent['source']) => {
    const key = source ?? 'valley';
    if (key === 'uptown') {
      return (
        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded border border-[#d4af37] bg-gradient-to-br from-gray-900 to-gray-800 text-amber-50">
          {EVENT_SOURCE_LABEL.uptown}
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded border border-gray-400 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-500">
        {EVENT_SOURCE_LABEL.valley}
      </span>
    );
  };

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

  const signupCountBadge = (count: number, needed?: number | null) => {
    const isFull = needed != null && count >= needed;
    const label =
      needed != null
        ? isFull
          ? `צוות מלא ${count}/${needed}`
          : count
            ? `מאויש חלקית ${count}/${needed}`
            : `טרם אויש 0/${needed}`
        : `${count} נרשמו`;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
          isFull
            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200'
            : count
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  };

  /** תג אזהרה למשמרת שמתחילה לפני 19:30 */
  const earlyStartBadge = (startTime: string | null) =>
    isEarlyStart(startTime) ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-orange-500 text-white dark:bg-orange-600 shadow-sm">
        <Clock className="w-3.5 h-3.5" />
        הגעה מוקדמת
      </span>
    ) : null;

  const signupButton = (event: WorkEvent, options?: { fullWidth?: boolean }) => {
    if (!currentEmployee) return null;
    const signedUp = isSignedUp(event.id);
    const busy = busyEventId === event.id;
    const widthClass = options?.fullWidth ? 'w-full' : '';

    // עובד שלא רשום ולא מתאים בתפקידו - הכפתור מוחלף בהסבר
    if (!signedUp && !isEligibleForEvent(event)) {
      return (
        <span
          className={`inline-flex items-center justify-center px-3.5 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700 ${widthClass}`}
        >
          מיועד ל: {EVENT_CATEGORY_ALLOWED_LABEL[classifyEventForRoles(event)]}
        </span>
      );
    }

    // המכסה התמלאה - הרשמה חסומה (ביטול עדיין אפשרי למי שרשום)
    if (!signedUp && isEventFull(event)) {
      return (
        <button
          type="button"
          disabled
          className={`px-3.5 py-2 text-sm font-medium rounded-lg bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed ${widthClass}`}
        >
          צוות מלא
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleToggleSignup(event)}
        disabled={busy}
        className={`px-3.5 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 ${widthClass} ${
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

  const eventCard = (event: WorkEvent) => {
    const eventSignups = signupsByEvent.get(event.id) ?? [];
    const signedUp = isSignedUp(event.id);
    const subVenues = splitSubVenues(event.sub_venues);
    const startTime = formatTime(event.start_time);
    const visual = resolveEventVisual(event);
    const isUptown = visual.kind === 'uptown';

    return (
      <div
        key={event.id}
        className={`rounded-xl border-2 shadow-sm overflow-hidden ${visual.card} ${
          signedUp && !isUptown ? 'ring-1 ring-green-400/70' : ''
        }`}
      >
        <div className={`p-4 ${isUptown ? '' : 'bg-white dark:bg-gray-900'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {sourceBadge(event.source)}
                {visual.kind === 'sweet' || visual.kind === 'joy' || visual.kind === 'maintenance' ? (
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded border ${visual.chip}`}>
                    {visual.label}
                  </span>
                ) : null}
              </div>
              <h3 className={`font-bold leading-snug ${isUptown ? 'text-amber-50' : 'text-gray-900 dark:text-white'}`}>
                {event.event_name}
              </h3>
              <p className={`mt-0.5 text-sm ${isUptown ? 'text-amber-100/70' : 'text-gray-500 dark:text-gray-400'}`}>
                {formatWeekday(event.event_date)}, {formatShortDate(event.event_date)}
              </p>
            </div>
            {eventTypeBadge(event.event_type)}
          </div>

          <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${isUptown ? 'text-amber-50/90' : 'text-gray-700 dark:text-gray-300'}`}>
            {startTime && (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Clock className={`w-4 h-4 ${isUptown ? 'text-amber-200/70' : 'text-gray-400 dark:text-gray-500'}`} />
                {startTime}
              </span>
            )}
            {signupCountBadge(eventSignups.length, event.needed_employees)}
            {earlyStartBadge(event.start_time)}
            {!isAdmin && signedUp && (
              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200">
                אתה רשום
              </span>
            )}
          </div>

          {subVenues.length > 0 && <div className="mt-3">{subVenueBadges(subVenues)}</div>}

          {eventSignups.length > 0 && (
            <p className={`mt-3 text-xs ${isUptown ? 'text-amber-100/60' : 'text-gray-500 dark:text-gray-400'}`}>
              נרשמו: {signupNames(eventSignups)}
            </p>
          )}
        </div>

        {(currentEmployee || isAdmin) && (
          <div className={`px-4 py-3 border-t flex items-center gap-2 ${
            isUptown
              ? 'border-[#d4af37]/40 bg-black/20'
              : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'
          }`}>
            <div className="flex-1">{signupButton(event, { fullWidth: true })}</div>
            {deleteButton(event)}
          </div>
        )}
      </div>
    );
  };

  const thClass = 'px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
  const tdClass = 'px-4 py-4 text-right text-sm text-gray-800 dark:text-gray-200 align-middle bg-white dark:bg-gray-900 group-hover:bg-blue-50/60 dark:group-hover:bg-gray-800/70 transition-colors border-b border-gray-100 dark:border-gray-800';

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">אירועים</h2>
          {!loading && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {events.length ? `${events.length} אירועים בחודש זה` : 'אין אירועים בחודש זה'}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              יומן
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <List className="w-4 h-4" />
              רשימה
            </button>
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
                onClick={() => setShowAddForm((prev) => !prev)}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                הוספת משמרת
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                העלאת קובץ אירועים (xlsx)
              </button>
              {events.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingAll ? 'מוחק...' : 'מחק אירועי החודש'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isAdmin && showAddForm && !preview && (
        <WorkEventForm onCreated={loadData} onClose={() => setShowAddForm(false)} />
      )}

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
                  <th className={thClass}>גיליון</th>
                  <th className={thClass}>מקור</th>
                  <th className={thClass}>שורה</th>
                  <th className={thClass}>תאריך</th>
                  <th className={thClass}>שם האירוע</th>
                  <th className={thClass}>סוג</th>
                  <th className={thClass}>תתי מתחמים</th>
                  <th className={thClass}>שעת התחלה</th>
                  <th className={thClass}>כמות עובדים</th>
                  <th className={thClass}>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={`${row.sheetName}-${row.rowNumber}`} className={`group ${row.errors.length ? 'opacity-60' : ''}`}>
                    <td className={tdClass}>{row.sheetName}</td>
                    <td className={tdClass}>{sourceBadge(row.source)}</td>
                    <td className={tdClass}>{row.rowNumber}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{row.event ? formatShortDate(row.event.event_date) : '---'}</td>
                    <td className={`${tdClass} font-medium`}>{row.event?.event_name ?? '---'}</td>
                    <td className={tdClass}>{row.event?.event_type ?? '---'}</td>
                    <td className={tdClass}>{row.event?.sub_venues ?? '---'}</td>
                    <td className={tdClass}>{row.event ? formatTime(row.event.start_time) ?? '---' : '---'}</td>
                    <td className={tdClass}>{row.event?.needed_employees ?? '---'}</td>
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

      {!isAdmin && !loading && !currentEmployee && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-sm">
          לא נמצאה רשומת עובד המשויכת למשתמש שלך, לכן לא ניתן להירשם לאירועים. פנה למנהל המערכת.
        </div>
      )}

      {loading && (
        <div className="p-10 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-gray-600 dark:text-gray-300">
          טוען אירועים...
        </div>
      )}

      {/* סינון משמרות רלוונטיות לתפקיד העובד */}
      {!loading && !isAdmin && currentEmployee && (
        <label className="mb-4 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyMyRoleEvents}
            onChange={(e) => setOnlyMyRoleEvents(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
          />
          הצג רק משמרות שמתאימות לתפקיד שלי
          {currentEmployee.job_title && (
            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200">
              {currentEmployee.job_title}
            </span>
          )}
        </label>
      )}

      {!loading && viewMode === 'calendar' && (
        <div className="space-y-4">
          <WorkEventsCalendar
            events={visibleEvents}
            year={viewYear}
            month={viewMonth}
            selectedDate={selectedDate}
            onMonthChange={handleMonthChange}
            onSelectDate={setSelectedDate}
            signedUpEventIds={signedUpEventIds}
          />

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {selectedDate
                ? `אירועים ב-${formatShortDate(selectedDate)}`
                : 'אירועי החודש'}
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="ms-2 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  הצג הכל
                </button>
              )}
            </h3>

            {displayedEvents.length === 0 ? (
              <div className="p-8 border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-gray-600 dark:text-gray-300">
                אין אירועים בתאריך שנבחר
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">{displayedEvents.map(eventCard)}</div>
            )}
          </div>
        </div>
      )}

      {!loading && viewMode === 'list' && visibleEvents.length === 0 && (
        <div className="p-12 border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
          <CalendarDays className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500" />
          <p className="mt-3 font-medium text-gray-700 dark:text-gray-300">אין אירועים בחודש זה</p>
          {isAdmin && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              העלה קובץ xlsx עם גיליון VALLEY וגיליון UPTOWN
            </p>
          )}
        </div>
      )}

      {!loading && viewMode === 'list' && visibleEvents.length > 0 && (
        <>
          <div className="md:hidden space-y-3">{visibleEvents.map(eventCard)}</div>

          <div className="hidden md:block border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full mt-0 shadow-none">
                <thead>
                  <tr>
                    <th className={thClass}>תאריך</th>
                    <th className={thClass}>מקור</th>
                    <th className={thClass}>שם האירוע</th>
                    <th className={thClass}>סוג אירוע</th>
                    <th className={thClass}>תתי מתחמים</th>
                    <th className={thClass}>שעת התחלה</th>
                    <th className={thClass}>נרשמים</th>
                    <th className={thClass}>{isAdmin ? 'פעולות' : 'הרשמה'}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEvents.map((event) => {
                    const eventSignups = signupsByEvent.get(event.id) ?? [];
                    const signedUp = isSignedUp(event.id);
                    const subVenues = splitSubVenues(event.sub_venues);
                    const startTime = formatTime(event.start_time);
                    const visual = resolveEventVisual(event);

                    return (
                      <tr key={event.id} className="group">
                        <td className={`${tdClass} whitespace-nowrap`}>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {formatWeekday(event.event_date)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatShortDate(event.event_date)}
                          </div>
                        </td>

                        <td className={tdClass}>
                          <div className="flex flex-col gap-1">
                            {sourceBadge(event.source)}
                            {(visual.kind === 'sweet' || visual.kind === 'joy' || visual.kind === 'maintenance') && (
                              <span className={`inline-flex w-fit px-2 py-0.5 text-[10px] font-semibold rounded border ${visual.chip}`}>
                                {visual.label}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className={`${tdClass} font-semibold text-gray-900 dark:text-white`}>
                          <span className={`inline-block border-s-4 ps-2 ${
                            visual.kind === 'sweet'
                              ? 'border-pink-400'
                              : visual.kind === 'joy'
                                ? 'border-teal-400'
                                : visual.kind === 'uptown'
                                  ? 'border-[#d4af37]'
                                  : visual.kind === 'maintenance'
                                    ? 'border-green-500'
                                    : 'border-gray-400'
                          }`}>
                            {event.event_name}
                          </span>
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
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
                                <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                {startTime}
                              </span>
                              {earlyStartBadge(event.start_time)}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">---</span>
                          )}
                        </td>

                        <td className={tdClass}>
                          <div className="flex flex-col items-start gap-1.5">
                            {signupCountBadge(eventSignups.length, event.needed_employees)}
                            {eventSignups.length > 0 && (
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
        </>
      )}
    </div>
  );
};
