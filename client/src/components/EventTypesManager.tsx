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
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">ניהול סוגי אירוע</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          {showAddForm ? '✖️ ביטול' : '➕ סוג חדש'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-3 border border-green-300 dark:border-green-600 rounded-lg bg-green-50 dark:bg-green-900/20">
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">הוספת סוג אירוע חדש</h4>
          <input
            type="text"
            value={newType.label}
            onChange={(e) => setNewType({ ...newType, label: e.target.value })}
            placeholder="שם להצגה (למשל: אירוע ממשלתי)"
            className="input-field w-full mb-2"
          />
          <input
            type="text"
            value={newType.key}
            onChange={(e) => setNewType({ ...newType, key: e.target.value })}
            placeholder="מזהה באנגלית (אופציונלי - ייווצר אוטומטית)"
            className="input-field w-full mb-2 ltr text-left"
            dir="ltr"
          />
          <button onClick={handleAddNew} className="btn-primary w-full text-sm">
            ➕ הוסף סוג אירוע
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">טוען סוגי אירוע...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {eventTypes.map((eventType) => (
            <div key={eventType.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
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
                    <button onClick={handleSaveEdit} className="btn-primary flex-1 text-sm">שמור</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary flex-1 text-sm">ביטול</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <span>{eventType.label}</span>
                      {eventType.is_active === false && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">לא פעיל</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 ltr text-right">{eventType.key}</div>
                  </div>
                  <div className="flex gap-2 mr-2">
                    <button
                      onClick={() => handleEdit(eventType)}
                      className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      title="עריכה"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(eventType)}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
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
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          לא נמצאו סוגי אירוע
        </div>
      )}
    </div>
  );
};

export default EventTypesManager;
