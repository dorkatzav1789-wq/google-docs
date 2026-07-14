import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { NewWorkEventInput, WorkEventSource } from '../types';
import { workEventsAPI } from '../services/supabaseAPI';
import { EVENT_SOURCE_LABEL } from '../utils/workEventHelpers';

interface WorkEventFormProps {
  onCreated: () => Promise<void> | void;
  onClose: () => void;
}

interface FormState {
  source: WorkEventSource;
  event_name: string;
  event_date: string;
  start_time: string;
  event_type: string;
  sub_venues: string;
  needed_employees: string;
}

const EMPTY_FORM: FormState = {
  source: 'valley',
  event_name: '',
  event_date: '',
  start_time: '',
  event_type: '',
  sub_venues: '',
  needed_employees: '',
};

/** טופס הוספת משמרת/אירוע ידני (אדמין) */
export const WorkEventForm: React.FC<WorkEventFormProps> = ({ onCreated, onClose }) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const neededEmployees = form.needed_employees ? Number(form.needed_employees) : null;
    const event: NewWorkEventInput = {
      source: form.source,
      event_name: form.event_name.trim(),
      event_date: form.event_date,
      start_time: form.start_time || null,
      event_type: form.event_type.trim() || null,
      sub_venues: form.sub_venues.trim() || null,
      needed_employees: neededEmployees,
    };

    try {
      setSaving(true);
      await workEventsAPI.create(event);
      setForm(EMPTY_FORM);
      await onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating work event:', err);
      alert('שגיאה בהוספת המשמרת. ייתכן שכבר קיים אירוע עם אותו שם, תאריך ומקור');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full p-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1';

  return (
    <div className="mb-8 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">הוספת משמרת חדשה</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור טופס"
          className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="event-source" className={labelClass}>מקום עבודה</label>
            <select
              id="event-source"
              value={form.source}
              onChange={(e) => setField('source', e.target.value as WorkEventSource)}
              className={inputClass}
            >
              <option value="valley">{EVENT_SOURCE_LABEL.valley}</option>
              <option value="uptown">{EVENT_SOURCE_LABEL.uptown}</option>
            </select>
          </div>

          <div>
            <label htmlFor="event-name" className={labelClass}>שם האירוע</label>
            <input
              id="event-name"
              type="text"
              required
              value={form.event_name}
              onChange={(e) => setField('event_name', e.target.value)}
              className={inputClass}
              placeholder="לדוגמה: חתונה - אולם JOY"
            />
          </div>

          <div>
            <label htmlFor="event-date" className={labelClass}>תאריך</label>
            <input
              id="event-date"
              type="date"
              required
              value={form.event_date}
              onChange={(e) => setField('event_date', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="event-time" className={labelClass}>שעת התחלה</label>
            <input
              id="event-time"
              type="time"
              value={form.start_time}
              onChange={(e) => setField('start_time', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="event-type" className={labelClass}>סוג אירוע</label>
            <input
              id="event-type"
              type="text"
              value={form.event_type}
              onChange={(e) => setField('event_type', e.target.value)}
              className={inputClass}
              placeholder="חתונה / כנס / בר מצווה"
            />
          </div>

          <div>
            <label htmlFor="event-venues" className={labelClass}>תתי מתחמים (מופרדים בפסיק)</label>
            <input
              id="event-venues"
              type="text"
              value={form.sub_venues}
              onChange={(e) => setField('sub_venues', e.target.value)}
              className={inputClass}
              placeholder="SWEET, JOY"
            />
          </div>

          <div>
            <label htmlFor="event-needed" className={labelClass}>כמות עובדים נדרשת</label>
            <input
              id="event-needed"
              type="number"
              min={1}
              value={form.needed_employees}
              onChange={(e) => setField('needed_employees', e.target.value)}
              className={inputClass}
              placeholder="לדוגמה: 4"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'שומר...' : 'הוסף משמרת'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
};
