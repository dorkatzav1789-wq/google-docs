import React, { useEffect, useState } from 'react';
import type { Employee } from '../types';
import { employeesAPI} from '../services/api';
import { WorkHoursTracker } from './WorkHoursTracker';
import { MonthlyReport } from './MonthlyReport';

type Tab = 'manage' | 'hours' | 'reports';

const EmployeesPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('manage');

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
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <h1>ניהול עובדים</h1>
          </div>
        </header>

        <main className="App-main">
          {/* טאבים פנימיים */}
          <div className="subnav">
            <button
                className={`subnav-btn ${tab === 'manage' ? 'active' : ''}`}
                onClick={() => setTab('manage')}
            >
              פרטי עובדים
            </button>
            <button
                className={`subnav-btn ${tab === 'hours' ? 'active' : ''}`}
                onClick={() => setTab('hours')}
            >
              רישום שעות
            </button>
            <button
                className={`subnav-btn ${tab === 'reports' ? 'active' : ''}`}
                onClick={() => setTab('reports')}
            >
              דוח חודשי
            </button>
          </div>

          <div className="card">
            {/* לשונית ניהול עובדים */}
            {tab === 'manage' && (
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-6">ניהול עובדים</h2>

                  {/* טופס הוספת עובד */}
                  <form onSubmit={handleAddEmployee} className="mb-8 p-4 border rounded">
                    <h3 className="text-lg font-semibold mb-4">הוסף עובד חדש</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                          type="text"
                          placeholder="שם פרטי"
                          value={newEmployee.first_name}
                          onChange={(e) =>
                              setNewEmployee((s) => ({ ...s, first_name: e.target.value }))
                          }
                          className="p-2 border rounded"
                          required
                      />
                      <input
                          type="text"
                          placeholder="שם משפחה"
                          value={newEmployee.last_name}
                          onChange={(e) =>
                              setNewEmployee((s) => ({ ...s, last_name: e.target.value }))
                          }
                          className="p-2 border rounded"
                          required
                      />
                      <input
                          type="tel"
                          placeholder="טלפון"
                          value={newEmployee.phone}
                          onChange={(e) =>
                              setNewEmployee((s) => ({ ...s, phone: e.target.value }))
                          }
                          className="p-2 border rounded"
                      />
                      <input
                          type="email"
                          placeholder="אימייל"
                          value={newEmployee.email}
                          onChange={(e) =>
                              setNewEmployee((s) => ({ ...s, email: e.target.value }))
                          }
                          className="p-2 border rounded"
                      />
                      <input
                          type="number"
                          step="0.01"
                          placeholder="שכר לשעה"
                          value={newEmployee.hourly_rate}
                          onChange={(e) =>
                              setNewEmployee((s) => ({
                                ...s,
                                hourly_rate: parseFloat(e.target.value) || 0,
                              }))
                          }
                          className="p-2 border rounded"
                          required
                      />
                      <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={newEmployee.is_active}
                            onChange={(e) =>
                                setNewEmployee((s) => ({ ...s, is_active: e.target.checked }))
                            }
                        />
                        פעיל
                      </label>
                    </div>
                    <button
                        type="submit"
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                        disabled={saving}
                    >
                      {saving ? 'שומר...' : 'הוסף עובד'}
                    </button>
                  </form>

                  {/* רשימת עובדים */}
                  <div className="grid gap-4">
                    {loading ? (
                        <div className="p-4 border rounded text-gray-600">טוען עובדים...</div>
                    ) : employees.length > 0 ? (
                        employees.map((emp) => (
                            <div key={emp.id} className="p-4 border rounded text-right">
                              {editingId === emp.id ? (
                                  <>
                                    <div className="grid grid-cols-2 gap-3">
                                      <input
                                          type="text"
                                          className="p-2 border rounded"
                                          placeholder="שם פרטי"
                                          value={(editDraft.first_name as string) ?? ''}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({ ...s, first_name: e.target.value }))
                                          }
                                      />
                                      <input
                                          type="text"
                                          className="p-2 border rounded"
                                          placeholder="שם משפחה"
                                          value={(editDraft.last_name as string) ?? ''}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({ ...s, last_name: e.target.value }))
                                          }
                                      />
                                      <input
                                          type="tel"
                                          className="p-2 border rounded"
                                          placeholder="טלפון"
                                          value={(editDraft.phone as string) ?? ''}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({ ...s, phone: e.target.value }))
                                          }
                                      />
                                      <input
                                          type="email"
                                          className="p-2 border rounded"
                                          placeholder="אימייל"
                                          value={(editDraft.email as string) ?? ''}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({ ...s, email: e.target.value }))
                                          }
                                      />
                                      <input
                                          type="number"
                                          step="0.01"
                                          className="p-2 border rounded"
                                          placeholder="שכר לשעה"
                                          value={Number(editDraft.hourly_rate ?? 0)}
                                          onChange={(e) =>
                                              setEditDraft((s) => ({
                                                ...s,
                                                hourly_rate: parseFloat(e.target.value) || 0,
                                              }))
                                          }
                                      />
                                      <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(editDraft.is_active)}
                                            onChange={(e) =>
                                                setEditDraft((s) => ({
                                                  ...s,
                                                  is_active: e.target.checked,
                                                }))
                                            }
                                        />
                                        פעיל
                                      </label>
                                    </div>

                                    <div className="mt-3 flex gap-2 justify-start">
                                      <button
                                          className="px-3 py-2 bg-green-600 text-white rounded"
                                          disabled={saving}
                                          onClick={() => saveEdit(emp.id)}
                                      >
                                        שמור
                                      </button>
                                      <button
                                          className="px-3 py-2 bg-gray-300 rounded"
                                          onClick={cancelEdit}
                                          type="button"
                                      >
                                        ביטול
                                      </button>
                                    </div>
                                  </>
                              ) : (
                                  <>
                                    <h4 className="font-semibold text-lg">{fullName(emp)}</h4>
                                    <p>טלפון: {emp.phone || 'לא צוין'}</p>
                                    <p>אימייל: {emp.email || 'לא צוין'}</p>
                                    <p>שכר לשעה: ₪{Number(emp.hourly_rate || 0).toLocaleString('he-IL')}</p>
                                    <p>סטטוס: {emp.is_active ? 'פעיל' : 'לא פעיל'}</p>

                                    <div className="mt-3">
                                      <button
                                          className="px-3 py-2 bg-blue-600 text-white rounded"
                                          onClick={() => startEdit(emp)}
                                          type="button"
                                      >
                                        ערוך
                                      </button>
                                    </div>
                                  </>
                              )}
                            </div>
                        ))
                    ) : (
                        <div className="p-4 border rounded text-gray-600">
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
