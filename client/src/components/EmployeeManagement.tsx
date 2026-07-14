import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { employeesAPI } from '../services/supabaseAPI';
import { WorkHoursTracker } from './WorkHoursTracker';
import { MonthlyReport } from './MonthlyReport';
import { WorkEventsTab } from './WorkEventsTab';
import { Button } from 'components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'components/ui/card';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Badge } from 'components/ui/badge';

type Tab = 'manage' | 'hours' | 'reports' | 'events';

interface EmployeesPageProps {
  onBack?: () => void;
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>(user?.role === 'admin' ? 'manage' : 'hours');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    job_title: '',
    hourly_rate: 0,
    is_active: true,
  });

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

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await employeesAPI.create({
        first_name: newEmployee.first_name,
        last_name: newEmployee.last_name,
        phone: newEmployee.phone || null,
        email: newEmployee.email || null,
        job_title: newEmployee.job_title.trim() || null,
        hourly_rate: newEmployee.hourly_rate,
      });

      setNewEmployee({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        job_title: '',
        hourly_rate: 0,
        is_active: true,
      });
      setShowAddForm(false);
      await loadEmployees();
      alert('העובד נוסף בהצלחה');
    } catch (err) {
      console.error('Error adding employee:', err);
      alert('שגיאה בהוספת עובד');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditDraft({
      first_name: emp.first_name,
      last_name: emp.last_name,
      phone: emp.phone,
      email: emp.email,
      job_title: emp.job_title,
      hourly_rate: emp.hourly_rate,
      is_active: emp.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async (id: number) => {
    try {
      setSaving(true);
      await employeesAPI.update(id, {
        first_name: (editDraft.first_name ?? '').toString().trim(),
        last_name: (editDraft.last_name ?? '').toString().trim(),
        phone: (editDraft.phone ?? '').toString().trim() || null,
        email: (editDraft.email ?? '').toString().trim() || null,
        job_title: (editDraft.job_title ?? '').toString().trim() || null,
        hourly_rate: Number(editDraft.hourly_rate ?? 0),
        is_active: Boolean(editDraft.is_active),
      });
      await loadEmployees();
      cancelEdit();
    } catch (err) {
      console.error('Error updating employee:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק את ${fullName(emp)}?`)) return;
    try {
      await employeesAPI.delete(emp.id);
      await loadEmployees();
      alert('העובד נמחק בהצלחה');
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert('שגיאה במחיקת העובד');
    }
  };

  const fullName = (emp: Employee) =>
    [emp.first_name, emp.last_name].filter(Boolean).join(' ') || '---';

  const filteredEmployees = employees.filter((emp) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      fullName(emp).toLowerCase().includes(q) ||
      (emp.phone || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q) ||
      (emp.job_title || '').toLowerCase().includes(q)
    );
  });

  const fieldClass =
    'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 transition-colors dark:bg-gray-900">
      <div className="container mx-auto p-4 md:p-6">
        <Card className="sticky top-3 z-10 mb-6 border-gray-200 bg-white/90 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 p-4 md:p-5">
            <div>
              <CardTitle className="text-2xl text-gray-900 md:text-3xl dark:text-white">
                ניהול עובדים
              </CardTitle>
              <CardDescription className="mt-1 text-gray-600 dark:text-gray-300">
                פרטי עובדים, שעות, דוחות ואירועים
              </CardDescription>
            </div>
            {onBack && (
              <Button
                variant="secondary"
                onClick={onBack}
                className="bg-gray-500 text-white hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
              >
                ← חזור
              </Button>
            )}
          </CardHeader>
        </Card>

        <div dir="rtl" className="subnav mb-6 rounded-lg bg-gray-800 p-4 dark:bg-gray-900">
          <div className="flex flex-wrap justify-center gap-2">
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
            <button
              className={`px-4 py-2 rounded font-medium transition-colors ${
                tab === 'events'
                  ? 'bg-gray-700 text-white dark:bg-gray-600'
                  : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600'
              }`}
              onClick={() => setTab('events')}
            >
              אירועים
            </button>
          </div>
        </div>

        <div dir="rtl">
          {tab === 'manage' && user?.role === 'admin' && (
            <>
              <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-gray-900 dark:text-white">פרטי עובדים</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setShowAddForm((v) => !v)}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {showAddForm ? '✖️ ביטול' : '➕ עובד חדש'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showAddForm && (
                    <form
                      onSubmit={handleAddEmployee}
                      className="mb-4 rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-600 dark:bg-green-900/20"
                    >
                      <h4 className="mb-3 font-semibold text-green-800 dark:text-green-300">
                        הוספת עובד חדש
                      </h4>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input
                          type="text"
                          placeholder="שם פרטי"
                          value={newEmployee.first_name}
                          onChange={(e) => setNewEmployee((s) => ({ ...s, first_name: e.target.value }))}
                          className={fieldClass}
                          required
                        />
                        <Input
                          type="text"
                          placeholder="שם משפחה"
                          value={newEmployee.last_name}
                          onChange={(e) => setNewEmployee((s) => ({ ...s, last_name: e.target.value }))}
                          className={fieldClass}
                          required
                        />
                        <Input
                          type="tel"
                          placeholder="טלפון"
                          value={newEmployee.phone}
                          onChange={(e) => setNewEmployee((s) => ({ ...s, phone: e.target.value }))}
                          className={fieldClass}
                        />
                        <Input
                          type="email"
                          placeholder="אימייל"
                          value={newEmployee.email}
                          onChange={(e) => setNewEmployee((s) => ({ ...s, email: e.target.value }))}
                          className={fieldClass}
                        />
                        <Input
                          type="text"
                          placeholder="תפקיד (למשל: סאונדמן)"
                          value={newEmployee.job_title}
                          onChange={(e) => setNewEmployee((s) => ({ ...s, job_title: e.target.value }))}
                          className={fieldClass}
                        />
                        <Input
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
                          className={fieldClass}
                          required
                        />
                        <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                          <input
                            type="checkbox"
                            checked={newEmployee.is_active}
                            onChange={(e) =>
                              setNewEmployee((s) => ({ ...s, is_active: e.target.checked }))
                            }
                            className="h-4 w-4 rounded"
                          />
                          פעיל
                        </label>
                      </div>
                      <Button type="submit" disabled={saving} className="mt-3 w-full sm:w-auto">
                        {saving ? 'שומר...' : '➕ הוסף עובד'}
                      </Button>
                    </form>
                  )}

                  <div className="mb-4">
                    <Input
                      type="text"
                      placeholder="חיפוש עובד..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={fieldClass}
                    />
                  </div>

                  {loading ? (
                    <div className="py-4 text-center">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                      <p className="mt-2 text-gray-600 dark:text-gray-300">טוען עובדים...</p>
                    </div>
                  ) : (
                    <div className="max-h-[32rem] space-y-2 overflow-y-auto">
                      {filteredEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/60"
                        >
                          {editingId === emp.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                  <Label className="mb-1 text-gray-700 dark:text-gray-300">שם פרטי</Label>
                                  <Input
                                    className={fieldClass}
                                    value={(editDraft.first_name as string) ?? ''}
                                    onChange={(e) =>
                                      setEditDraft((s) => ({ ...s, first_name: e.target.value }))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1 text-gray-700 dark:text-gray-300">שם משפחה</Label>
                                  <Input
                                    className={fieldClass}
                                    value={(editDraft.last_name as string) ?? ''}
                                    onChange={(e) =>
                                      setEditDraft((s) => ({ ...s, last_name: e.target.value }))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1 text-gray-700 dark:text-gray-300">טלפון</Label>
                                  <Input
                                    className={fieldClass}
                                    value={(editDraft.phone as string) ?? ''}
                                    onChange={(e) =>
                                      setEditDraft((s) => ({ ...s, phone: e.target.value }))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1 text-gray-700 dark:text-gray-300">אימייל</Label>
                                  <Input
                                    className={fieldClass}
                                    value={(editDraft.email as string) ?? ''}
                                    onChange={(e) =>
                                      setEditDraft((s) => ({ ...s, email: e.target.value }))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1 text-gray-700 dark:text-gray-300">תפקיד</Label>
                                  <Input
                                    className={fieldClass}
                                    value={(editDraft.job_title as string) ?? ''}
                                    onChange={(e) =>
                                      setEditDraft((s) => ({ ...s, job_title: e.target.value }))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1 text-gray-700 dark:text-gray-300">תשלום יומי</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className={fieldClass}
                                    value={Number(editDraft.hourly_rate ?? 0)}
                                    onChange={(e) =>
                                      setEditDraft((s) => ({
                                        ...s,
                                        hourly_rate: parseFloat(e.target.value) || 0,
                                      }))
                                    }
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(editDraft.is_active)}
                                    onChange={(e) =>
                                      setEditDraft((s) => ({ ...s, is_active: e.target.checked }))
                                    }
                                    className="h-4 w-4 rounded"
                                  />
                                  פעיל
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={saving}
                                  onClick={() => saveEdit(emp.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  שמור
                                </Button>
                                <Button size="sm" variant="secondary" onClick={cancelEdit}>
                                  ביטול
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 text-right">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <span className="font-semibold text-gray-800 dark:text-white">
                                    {fullName(emp)}
                                  </span>
                                  {emp.job_title && (
                                    <Badge variant="secondary">{emp.job_title}</Badge>
                                  )}
                                  <Badge variant={emp.is_active ? 'success' : 'outline'}>
                                    {emp.is_active ? 'פעיל' : 'לא פעיל'}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                  טלפון: {emp.phone || 'לא צוין'}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  אימייל: {emp.email || 'לא צוין'}
                                </p>
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  ₪{Number(emp.hourly_rate || 0).toLocaleString('he-IL')} ליום
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEdit(emp)}
                                  className="rounded px-2 py-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                  title="עריכה"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(emp)}
                                  className="rounded px-2 py-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                  title="מחיקה"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!loading && filteredEmployees.length === 0 && (
                    <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'לא נמצאו עובדים תואמים' : 'אין עובדים להצגה כרגע'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'hours' && (
            <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <CardContent className="p-3 md:p-4">
                <WorkHoursTracker />
              </CardContent>
            </Card>
          )}

          {tab === 'reports' && (
            <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-sm border">
              <MonthlyReport />
            </div>
          )}

          {tab === 'events' && (
            <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <CardContent className="p-3 md:p-4">
                <WorkEventsTab />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeesPage;
