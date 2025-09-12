import React, { useEffect, useState } from 'react';
import type { Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { employeesAPI } from '../services/supabaseAPI';
import { WorkHoursTracker } from './WorkHoursTracker';
import { MonthlyReport } from './MonthlyReport';

type Tab = 'manage' | 'hours' | 'reports';

interface EmployeesPageProps {
  onBack?: () => void;
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  // משתמש רגיל יראה ישירות את טאב רישום שעות
  const [tab, setTab] = useState<Tab>(user?.role === 'admin' ? 'manage' : 'hours');

  // ----- ניהול עובדים -----
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // עובד חדש
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    hourly_rate: 0,
    is_active: true,
  });

  // מצב עריכה לעובד קיים
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (tab === 'manage') {
      void loadEmployees();
    }
  }, [tab]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeesAPI.getAll();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // הוספת עובד חדש
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      // ב-EmployeeManagement כששולחים create:
      await employeesAPI.create({
        first_name: newEmployee.first_name,
        last_name: newEmployee.last_name,
        phone: newEmployee.phone || null,
        email: newEmployee.email || null,
        hourly_rate: newEmployee.hourly_rate,
        // name: `${newEmployee.first_name} ${newEmployee.last_name}`.trim(), // אופציונלי
      });

      setNewEmployee({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        hourly_rate: 0,
        is_active: true,
      });
      await loadEmployees();
      alert('העובד נוסף בהצלחה');
    } catch (err) {
      console.error('Error adding employee:', err);
      alert('שגיאה בהוספת עובד');
    } finally {
      setSaving(false);
    }
  };

  // התחלת עריכה
  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditDraft({
      first_name: emp.first_name,
      last_name: emp.last_name,
      phone: emp.phone,
      email: emp.email,
      hourly_rate: emp.hourly_rate,
      is_active: emp.is_active,
    });
  };

  // ביטול עריכה
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  // שמירת עריכה
  const saveEdit = async (id: number) => {
    try {
      setSaving(true);
      await employeesAPI.update(id, {
        first_name: (editDraft.first_name ?? '').toString().trim(),
        last_name: (editDraft.last_name ?? '').toString().trim(),
        phone: (editDraft.phone ?? '').toString().trim() || null,
        email: (editDraft.email ?? '').toString().trim() || null,
        hourly_rate: Number(editDraft.hourly_rate ?? 0),
        is_active: Boolean(editDraft.is_active),
      });
      await loadEmployees();
      cancelEdit();
      console.log('העובד עודכן בהצלחה');
    } catch (err) {
      console.error('Error updating employee:', err);
      console.log('שגיאה בעדכון עובד');
    } finally {
      setSaving(false);
    }
  };

  const fullName = (emp: Employee) =>
      [emp.first_name, emp.last_name].filter(Boolean).join(' ') || '---';

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="App-header bg-gray-800 dark:bg-gray-900 shadow-sm p-4 mb-0 border-b border-gray-200 dark:border-gray-700">
          <div className="header-content flex justify-between items-center">
            <div className="flex flex-col">
              {/* Breadcrumbs */}
              <nav className="flex items-center space-x-2 text-sm mb-2" aria-label="Breadcrumb">
                {user?.role === 'admin' && onBack && (
                  <>
                    <button 
                      onClick={onBack} 
                      className="flex items-center text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-200 transition-colors"
                    >
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      הצעות מחיר
                    </button>
                    <span className="text-gray-400 dark:text-gray-500">/</span>
                  </>
                )}
                <span className="text-gray-300 dark:text-gray-400">ניהול עובדים</span>
              </nav>
              <h1 className="text-2xl font-bold text-white dark:text-white">ניהול עובדים</h1>
            </div>
            <div className="flex items-center gap-4">

            </div>
          </div>
        </header>

        <main className="bg-gray-50 dark:bg-gray-900 min-h-screen">
          {/* טאבים פנימיים */}
          <div className="subnav bg-gray-800 dark:bg-gray-900 p-4">
            <div className="flex gap-2 flex-wrap justify-center">
              {user?.role === 'admin' && (
                <button
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      tab === 'manage' 
                        ? 'bg-gray-700 text-white dark:bg-gray-600' 
                        : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setTab('manage')}
                >
                  פרטי עובדים
                </button>
              )}
              <button
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    tab === 'hours' 
                      ? 'bg-gray-700 text-white dark:bg-gray-600' 
                      : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setTab('hours')}
              >
                רישום ימים
              </button>
              <button
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    tab === 'reports' 
                      ? 'bg-gray-700 text-white dark:bg-gray-600' 
                      : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                  onClick={() => setTab('reports')}
              >
                דוח חודשי
              </button>
            </div>
          </div>

          <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 mx-6 mt-6 rounded-lg shadow-sm border">
            {/* לשונית ניהול עובדים */}
            {tab === 'manage' && user?.role === 'admin' && (
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">ניהול עובדים</h2>

                  {/* טופס הוספת עובד */}
                  <form onSubmit={handleAddEmployee} className="mb-8 p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">הוסף עובד חדש</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                          type="text"
                          placeholder="שם פרטי"
                          value={newEmployee.first_name}
                          onChange={(e) =>
                              setNewEmployee((s) => ({ ...s, first_name: e.target.value }))
                          }
                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                          required
                      />
                      <input
                          type="text"
                          placeholder="שם משפחה"
                          value={newEmployee.last_name}
                          onChange={(e) =>
                              setNewEmployee((s) => ({ ...s, last_name: e.target.value }))
                          }
                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                          required
                      />
                      <input
                          type="tel"
                          placeholder="טלפון"
                          value={newEmployee.phone}
                          onChange={(e) =>
                              setNewEmployee((s) => ({ ...s, phone: e.target.value }))
                          }
                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                      />
                      <input
                          type="email"
                          placeholder="אימייל"
                          value={newEmployee.email}
                          onChange={(e) =>
                              setNewEmployee((s) => ({ ...s, email: e.target.value }))
                          }
                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                      />
                      <input
                          type="number"
                          step="0.01"
                          placeholder="תשלום יומי"
                          value={newEmployee.hourly_rate}
                          onChange={(e) =>
                              setNewEmployee((s) => ({
                                ...s,
                                hourly_rate: parseFloat(e.target.value) || 0,
                              }))
                          }
                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                          required
                      />
                      <label className="flex items-center gap-2 text-gray-900 dark:text-white">
                        <input
                            type="checkbox"
                            checked={newEmployee.is_active}
                            onChange={(e) =>
                                setNewEmployee((s) => ({ ...s, is_active: e.target.checked }))
                            }
                            className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        פעיל
                      </label>
                    </div>
                    <button
                        type="submit"
                        className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded transition-colors"
                        disabled={saving}
                    >
                      {saving ? 'שומר...' : 'הוסף עובד'}
                    </button>
                  </form>

                  {/* רשימת עובדים */}
                  <div className="grid gap-4">
                    {loading ? (
                        <div className="p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300">טוען עובדים...</div>
                    ) : employees.length > 0 ? (
                        employees.map((emp) => (
                            <div key={emp.id} className="p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg text-right">
                              {editingId === emp.id ? (
                                  <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <input
                                          type="text"
                                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                                          placeholder="שם פרטי"
                                          value={(editDraft.first_name as string) ?? ''}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({ ...s, first_name: e.target.value }))
                                          }
                                      />
                                      <input
                                          type="text"
                                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                                          placeholder="שם משפחה"
                                          value={(editDraft.last_name as string) ?? ''}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({ ...s, last_name: e.target.value }))
                                          }
                                      />
                                      <input
                                          type="tel"
                                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                                          placeholder="טלפון"
                                          value={(editDraft.phone as string) ?? ''}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({ ...s, phone: e.target.value }))
                                          }
                                      />
                                      <input
                                          type="email"
                                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                                          placeholder="אימייל"
                                          value={(editDraft.email as string) ?? ''}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({ ...s, email: e.target.value }))
                                          }
                                      />
                                      <input
                                          type="number"
                                          step="0.01"
                                          className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded"
                                          placeholder="תשלום יומי"
                                           value={Number(editDraft.hourly_rate ?? 0)}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({
                                                ...s,
                                                hourly_rate: parseFloat(e.target.value) || 0,
                                              }))
                                          }
                                      />
                                      <label className="flex items-center gap-2 text-gray-900 dark:text-white">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(editDraft.is_active)}
                                            onChange={(e) =>
                                                setEditDraft((s) => ({
                                                  ...s,
                                                  is_active: e.target.checked,
                                                }))
                                            }
                                            className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                                        />
                                        פעיל
                                      </label>
                                    </div>

                                    <div className="mt-3 flex gap-2 justify-start">
                                      <button
                                          className="px-3 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded transition-colors"
                                          disabled={saving}
                                          onClick={() => saveEdit(emp.id)}
                                      >
                                        שמור
                                      </button>
                                      <button
                                          className="px-3 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors"
                                          onClick={cancelEdit}
                                          type="button"
                                      >
                                        ביטול
                                      </button>
                                    </div>
                                  </>
                              ) : (
                                  <>
                                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{fullName(emp)}</h4>
                                    <p className="text-gray-700 dark:text-gray-300">טלפון: {emp.phone || 'לא צוין'}</p>
                                    <p className="text-gray-700 dark:text-gray-300">אימייל: {emp.email || 'לא צוין'}</p>
                                    <p className="text-gray-700 dark:text-gray-300">תשלום יומי: ₪{Number(emp.hourly_rate || 0).toLocaleString('he-IL')}</p>
                                    <p className="text-gray-700 dark:text-gray-300">סטטוס: {emp.is_active ? 'פעיל' : 'לא פעיל'}</p>

                                    <div className="mt-3 flex gap-2">
                                      <button
                                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded transition-colors"
                                          onClick={() => startEdit(emp)}
                                          type="button"
                                      >
                                        ערוך
                                      </button>
                                      <button
                                          className="px-3 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded transition-colors"
                                          onClick={async () => {
                                            if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${fullName(emp)}?`)) {
                                              try {
                                                await employeesAPI.delete(emp.id);
                                                await loadEmployees();
                                                alert('העובד נמחק בהצלחה');
                                              } catch (err) {
                                                console.error('Error deleting employee:', err);
                                                alert('שגיאה במחיקת העובד');
                                              }
                                            }
                                          }}
                                          type="button"
                                      >
                                        מחק
                                      </button>
                                    </div>
                                  </>
                              )}
                            </div>
                        ))
                    ) : (
                        <div className="p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300">
                          אין עובדים להצגה כרגע
                        </div>
                    )}
                  </div>
                </div>
            )}

            {/* לשונית רישום שעות */}
            {tab === 'hours' && <WorkHoursTracker />}

            {/* לשונית דוח חודשי */}
            {tab === 'reports' && <MonthlyReport />}
          </div>
        </main>
      </div>
  );
};

export default EmployeesPage;
