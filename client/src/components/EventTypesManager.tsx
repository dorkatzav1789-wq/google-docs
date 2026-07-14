import React, { useState, useEffect } from 'react';
import { EventType } from '../types';
import { eventTypesAPI } from '../services/supabaseAPI';

// יצירת מפתח (key) באנגלית מתוך שם להצגה; אם השם אינו לטיני (למשל עברית) ניצור מפתח ייחודי
const generateKey = (label: string): string => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `type_${Date.now()}`;
};

const EventTypesManager: React.FC = () => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ label: '', is_active: true });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState({ label: '', key: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await eventTypesAPI.getAll();
      setEventTypes(data);
    } catch (error) {
      console.error('שגיאה בטעינת סוגי אירוע:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (eventType: EventType) => {
    setEditingId(eventType.id);
    setEditForm({ label: eventType.label, is_active: eventType.is_active ?? true });
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    if (!editForm.label.trim()) {
      alert('יש להזין שם להצגה');
      return;
    }

    try {
      await eventTypesAPI.update(editingId, {
        label: editForm.label.trim(),
        is_active: editForm.is_active,
      });
      await loadData();
      setEditingId(null);
    } catch (error) {
      console.error('שגיאה בעדכון סוג אירוע:', error);
      alert('שגיאה בעדכון סוג אירוע');
    }
  };

  const handleDelete = async (eventType: EventType) => {
    if (!window.confirm(`האם למחוק את סוג האירוע "${eventType.label}"?\nשים לב: רישומי שעות שכבר נשמרו עם סוג זה לא ישתנו.`)) {
      return;
    }

    try {
      await eventTypesAPI.delete(eventType.id);
      await loadData();
    } catch (error) {
      console.error('שגיאה במחיקת סוג אירוע:', error);
      alert('שגיאה במחיקת סוג אירוע');
    }
  };

  const handleAddNew = async () => {
    const label = newType.label.trim();
    if (!label) {
      alert('יש להזין שם להצגה');
      return;
    }

    const key = (newType.key.trim() || generateKey(label)).toLowerCase();

    if (eventTypes.some((t) => t.key === key)) {
      alert('כבר קיים סוג אירוע עם מזהה זהה. בחר מזהה אחר.');
      return;
    }

    try {
      const maxSort = eventTypes.reduce((max, t) => Math.max(max, t.sort_order ?? 0), 0);
      await eventTypesAPI.create({
        key,
        label,
        sort_order: maxSort + 10,
        is_active: true,
      });
      await loadData();
      setNewType({ label: '', key: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('שגיאה בהוספת סוג אירוע:', error);
      alert('שגיאה בהוספת סוג אירוע');
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
        >
          {showAddForm ? '✖️ ביטול' : '➕ סוג חדש'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-600 dark:bg-green-900/20">
          <h4 className="mb-2 font-semibold text-green-800 dark:text-green-300">הוספת סוג אירוע חדש</h4>
          <input
            type="text"
            value={newType.label}
            onChange={(e) => setNewType({ ...newType, label: e.target.value })}
            placeholder="שם להצגה (למשל: אירוע ממשלתי)"
            className="input-field mb-2 w-full"
          />
          <input
            type="text"
            value={newType.key}
            onChange={(e) => setNewType({ ...newType, key: e.target.value })}
            placeholder="מזהה באנגלית (אופציונלי - ייווצר אוטומטית)"
            className="input-field mb-2 w-full text-left ltr"
            dir="ltr"
          />
          <button onClick={handleAddNew} className="btn-primary w-full text-sm">
            ➕ הוסף סוג אירוע
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-2 text-gray-600 dark:text-gray-300">טוען סוגי אירוע...</p>
        </div>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {eventTypes.map((eventType) => (
            <div
              key={eventType.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/60"
            >
              {editingId === eventType.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.label}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    placeholder="שם להצגה"
                    className="input-field w-full"
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    מזהה: <span className="ltr">{eventType.key}</span> (לא ניתן לשינוי)
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    />
                    פעיל (יוצג ברשימת הבחירה)
                  </label>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="btn-primary flex-1 text-sm">
                      שמור
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary flex-1 text-sm">
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
                      <span>{eventType.label}</span>
                      {eventType.is_active === false && (
                        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-300">
                          לא פעיל
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500 ltr dark:text-gray-400">
                      {eventType.key}
                    </div>
                  </div>
                  <div className="mr-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(eventType)}
                      className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      title="עריכה"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(eventType)}
                      className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                      title="מחיקה"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {eventTypes.length === 0 && !loading && (
        <div className="py-4 text-center text-gray-500 dark:text-gray-400">לא נמצאו סוגי אירוע</div>
      )}
    </div>
  );
};

export default EventTypesManager;
