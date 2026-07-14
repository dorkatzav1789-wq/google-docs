import React, { useMemo } from 'react';
import type { WorkEvent } from '../types';
import {
  EVENT_SOURCE_LABEL,
  EVENT_VISUAL_CLASSES,
  isEarlyStart,
  resolveEventVisual,
  toIsoDate,
} from '../utils/workEventHelpers';

const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

interface WorkEventsCalendarProps {
  events: WorkEvent[];
  year: number;
  month: number; // 0-11
  selectedDate: string | null;
  onMonthChange: (year: number, month: number) => void;
  onSelectDate: (isoDate: string) => void;
  signedUpEventIds?: Set<number>;
}

interface CalendarCell {
  isoDate: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: WorkEvent[];
}

const buildMonthCells = (year: number, month: number, eventsByDate: Map<string, WorkEvent[]>): CalendarCell[] => {
  const todayIso = toIsoDate(new Date());
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = [];

  // ימים מהחודש הקודם למילוי הגריד
  for (let i = 0; i < startWeekday; i++) {
    const date = new Date(year, month, -startWeekday + i + 1);
    const isoDate = toIsoDate(date);
    cells.push({
      isoDate,
      day: date.getDate(),
      inCurrentMonth: false,
      isToday: isoDate === todayIso,
      events: eventsByDate.get(isoDate) ?? [],
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isoDate = toIsoDate(date);
    cells.push({
      isoDate,
      day,
      inCurrentMonth: true,
      isToday: isoDate === todayIso,
      events: eventsByDate.get(isoDate) ?? [],
    });
  }

  // השלמה לשבועות מלאים
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const next = new Date(`${last.isoDate}T00:00:00`);
    next.setDate(next.getDate() + 1);
    const isoDate = toIsoDate(next);
    cells.push({
      isoDate,
      day: next.getDate(),
      inCurrentMonth: false,
      isToday: isoDate === todayIso,
      events: eventsByDate.get(isoDate) ?? [],
    });
  }

  return cells;
};

export const WorkEventsCalendar: React.FC<WorkEventsCalendarProps> = ({
  events,
  year,
  month,
  selectedDate,
  onMonthChange,
  onSelectDate,
  signedUpEventIds,
}) => {
  const eventsByDate = useMemo(() => {
    const map = new Map<string, WorkEvent[]>();
    for (const event of events) {
      const list = map.get(event.event_date) ?? [];
      list.push(event);
      map.set(event.event_date, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => buildMonthCells(year, month, eventsByDate), [year, month, eventsByDate]);

  const monthTitle = useMemo(
    () => new Date(year, month, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }),
    [year, month]
  );

  const isCurrentMonthView = useMemo(() => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month;
  }, [year, month]);

  const goPrev = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };

  const goNext = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  const goToday = () => {
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth());
    onSelectDate(toIsoDate(now));
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{monthTitle}</h3>
          {isCurrentMonthView && (
            <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
              החודש הנוכחי
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            title="מעבר לחודש הקודם"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            › חודש קודם
          </button>
          <button
            type="button"
            onClick={goToday}
            title="חזרה להיום"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            היום
          </button>
          <button
            type="button"
            onClick={goNext}
            title="מעבר לחודש הבא"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            חודש הבא ‹
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-1 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {cells.map((cell) => {
          const selected = selectedDate === cell.isoDate;
          return (
            <button
              key={cell.isoDate}
              type="button"
              onClick={() => onSelectDate(cell.isoDate)}
              className={`min-h-[5.5rem] sm:min-h-[7rem] p-1 sm:p-1.5 text-right border-t border-e border-gray-100 dark:border-gray-800 transition-colors align-top ${
                cell.inCurrentMonth
                  ? 'bg-white dark:bg-gray-900'
                  : 'bg-gray-50/70 dark:bg-gray-950/40'
              } ${
                selected
                  ? 'ring-2 ring-inset ring-blue-500 dark:ring-blue-400'
                  : 'hover:bg-blue-50/40 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 text-xs font-semibold rounded-full ${
                    cell.isToday
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                      : cell.inCurrentMonth
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {cell.day}
                </span>
                {cell.events.length > 2 && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    +{cell.events.length - 2}
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                {cell.events.slice(0, 2).map((event) => {
                  const visual = resolveEventVisual(event);
                  const signedUp = signedUpEventIds?.has(event.id);
                  const early = isEarlyStart(event.start_time);
                  return (
                    <div
                      key={event.id}
                      title={`${EVENT_SOURCE_LABEL[event.source ?? 'valley']}: ${event.event_name}${early ? ' (הגעה מוקדמת)' : ''}`}
                      className={`truncate rounded border px-1 py-0.5 text-[10px] sm:text-xs leading-tight ${visual.chip} ${
                        signedUp ? 'outline outline-1 outline-offset-0 outline-green-500' : ''
                      }`}
                    >
                      {early && <span aria-hidden className="me-0.5 inline-block w-1.5 h-1.5 rounded-full bg-orange-500 align-middle" />}
                      {event.event_name}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
        <span className="font-semibold text-gray-700 dark:text-gray-200">מקרא:</span>
        {(
          [
            ['sweet', EVENT_VISUAL_CLASSES.sweet],
            ['joy', EVENT_VISUAL_CLASSES.joy],
            ['valley', EVENT_VISUAL_CLASSES.valley],
            ['uptown', EVENT_VISUAL_CLASSES.uptown],
            ['maintenance', EVENT_VISUAL_CLASSES.maintenance],
          ] as const
        ).map(([key, style]) => (
          <span
            key={key}
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 ${style.chip}`}
          >
            {style.label}
          </span>
        ))}
      </div>
    </div>
  );
};
