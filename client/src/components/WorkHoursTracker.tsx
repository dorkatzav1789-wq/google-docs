import React, { useState, useEffect, useCallback } from 'react';
import type { Employee, EventType } from '../types';
import { employeesAPI, workHoursAPI, eventTypesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const WorkHoursTracker: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [workHours, setWorkHours] = useState({
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: 0,
    notes: '',
    overtime_amount: 0,
    event_type: 'business' as string
  });
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showCreateEmployeeForm, setShowCreateEmployeeForm] = useState<boolean>(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    hourly_rate: 100
  });

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      if (user?.role === 'admin') {
        const data = await employeesAPI.getAll();
        // נרמול תשובה — תמיד למערך
        const normalized = Array.isArray(data)
            ? data
            : Array.isArray((data as any)?.data)
                ? (data as any).data
                : [];
        setEmployees(normalized);
      } else {
        const data = await employeesAPI.getCurrentUserEmployee();
        setEmployees(data ? [data] : []);
        if (data) {
          setSelectedEmployee(data.id);
        } else {
          setShowCreateEmployeeForm(true);
        }
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    const loadEventTypes = async () => {
      try {
        const data = await eventTypesAPI.getAll();
        const active = data.filter((t) => t.is_active !== false);
        setEventTypes(active);
        // אם סוג ברירת המחדל אינו קיים, נבחר את הראשון הזמין
        setWorkHours((prev) =>
          active.some((t) => t.key === prev.event_type) || active.length === 0
            ? prev
            : { ...prev, event_type: active[0].key }
        );
      } catch (error) {
        console.error('Error loading event types:', error);
      }
    };
    loadEventTypes();
  }, []);

  const handleAddWorkHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      setSubmitting(true);
      const employee = employees.find((emp) => emp.id === selectedEmployee);
      if (!employee) {
        alert('לא נמצא עובד נבחר');
        return;
      }

      const days = 1; // תמיד יום אחד
      const rate = Number(employee.hourly_rate || 0);

      const workHoursData = {
        employee_id: selectedEmployee,
        work_date: workHours.work_date,
        hours_worked: days, // נשתמש באותו שדה אבל נכניס 1
        hourly_rate: rate,
        total_amount: (days * rate) + workHours.overtime_amount, // חישוב הסכום הכולל כולל שעות נוספות
        overtime_amount: workHours.overtime_amount,
        notes: workHours.notes,
        event_type: workHours.event_type,
      };

      await workHoursAPI.create(workHoursData);

      setWorkHours({
        work_date: new Date().toISOString().split('T')[0],
        hours_worked: 0,
        notes: '',
        overtime_amount: 0,
        event_type: eventTypes[0]?.key ?? 'business'
      });
      alert('יום העבודה נוסף בהצלחה!');
    } catch (error) {
      console.error('Error adding work hours:', error);
      alert('שגיאה בהוספת יום העבודה');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await employeesAPI.create({
        first_name: newEmployeeForm.first_name,
        last_name: newEmployeeForm.last_name,
        phone: newEmployeeForm.phone || null,
        email: user?.email || null,
        hourly_rate: newEmployeeForm.hourly_rate,
        is_active: true
      });
      
      await loadEmployees();
      setShowCreateEmployeeForm(false);
      alert('העובד נוסף בהצלחה! כעת תוכל לרשום ימי עבודה.');
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('שגיאה ביצירת עובד');
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = (emp: Employee) =>
      (emp.first_name || emp.last_name)
          ? `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim()
          : (emp.name ?? 'ללא שם');

  return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">רישום ימי עבודה</h2>

        <form onSubmit={handleAddWorkHours} className="mb-8 p-4 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
                value={selectedEmployee ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedEmployee(v ? parseInt(v, 10) : null);
                }}
                className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                required
                title="בחר עובד"
                aria-label="בחר עובד"
                disabled={loading}
            >
              <option value="">בחר עובד</option>
              {(employees ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {fullName(employee)} (₪
                    {Number(employee.hourly_rate || 0).toLocaleString('he-IL')}/יום)
                  </option>
              ))}
            </select>

            <input
                type="date"
                value={workHours.work_date}
                onChange={(e) =>
                    setWorkHours({ ...workHours, work_date: e.target.value })
                }
                className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                required
                title="תאריך עבודה"
                aria-label="תאריך עבודה"
            />

            <select
                value={workHours.event_type}
                onChange={(e) => setWorkHours({ ...workHours, event_type: e.target.value })}
                className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                required
                title="סוג אירוע"
                aria-label="סוג אירוע"
            >
              {eventTypes.length === 0 ? (
                <>
                  <option value="business">אירוע עסקי</option>
                  <option value="personal">אירוע פרטי</option>
                </>
              ) : (
                eventTypes.map((type) => (
                  <option key={type.id} value={type.key}>{type.label}</option>
                ))
              )}
            </select>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-green-700 dark:text-green-400">
                💰 שעות נוספות (₪)
              </label>
              <input
                  type="number"
                  placeholder="הזן סכום שעות נוספות"
                  value={workHours.overtime_amount}
                  onChange={(e) => setWorkHours({ ...workHours, overtime_amount: Number(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20 text-black dark:text-black rounded font-medium"
                  title="שעות נוספות"
                  aria-label="שעות נוספות"
                  min="0"
                  step="0.01"
                  style={{ 
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderColor: '#22c55e',
                    boxShadow: '0 0 0 1px #22c55e20',
                    color: '#000000'
                  }}
              />
              <p className="text-xs text-green-600 dark:text-green-400">
                סכום נוסף שיתווסף למשכורת היומית
              </p>
            </div>

            <input
                type="text"
                placeholder="הערות"
                value={workHours.notes}
                onChange={(e) => setWorkHours({ ...workHours, notes: e.target.value })}
                className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                title="הערות"
                aria-label="הערות"
            />
          </div>

          {/* הצגת סכום כולל */}
          {selectedEmployee && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">סכום יומי:</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  ₪{Number(employees.find(emp => emp.id === selectedEmployee)?.hourly_rate || 0).toLocaleString('he-IL')}
                </span>
              </div>
              {workHours.overtime_amount > 0 && (
                <div className="flex justify-between items-center mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">💰 שעות נוספות:</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    +₪{workHours.overtime_amount.toLocaleString('he-IL')}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                <span className="text-xl font-bold text-gray-900 dark:text-white">סה"כ ליום:</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ₪{((Number(employees.find(emp => emp.id === selectedEmployee)?.hourly_rate || 0)) + workHours.overtime_amount).toLocaleString('he-IL')}
                </span>
              </div>
            </div>
          )}

          <button
              type="submit"
              className="mt-4 px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
              disabled={submitting || loading}
          >
            {submitting ? 'שומר...' : 'הוסף יום עבודה'}
          </button>
        </form>

        {loading && <div className="text-gray-500 dark:text-gray-400">טוען עובדים...</div>}
        {!loading && (employees ?? []).length === 0 && (
            <div className="text-gray-600 dark:text-gray-400">אין עובדים במערכת עדיין.</div>
        )}

        {showCreateEmployeeForm && (
          <div className="mb-8 p-6 border border-blue-200 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">הוסף פרטים אישיים</h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              כדי להתחיל לרשום ימי עבודה, נדרשים פרטיך האישיים.
            </p>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="שם פרטי"
                  value={newEmployeeForm.first_name}
                  onChange={(e) => setNewEmployeeForm({...newEmployeeForm, first_name: e.target.value})}
                  className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
                <input
                  type="text"
                  placeholder="שם משפחה"
                  value={newEmployeeForm.last_name}
                  onChange={(e) => setNewEmployeeForm({...newEmployeeForm, last_name: e.target.value})}
                  className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
                <input
                  type="text"
                  placeholder="טלפון (אופציונלי)"
                  value={newEmployeeForm.phone}
                  onChange={(e) => setNewEmployeeForm({...newEmployeeForm, phone: e.target.value})}
                  className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                />
                <input
                  type="number"
                  placeholder="שכר יומי"
                  value={newEmployeeForm.hourly_rate}
                  onChange={(e) => setNewEmployeeForm({...newEmployeeForm, hourly_rate: Number(e.target.value) || 0})}
                  className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                disabled={submitting}
              >
                {submitting ? 'שומר...' : 'שמור פרטים והתחל לרשום'}
              </button>
            </form>
          </div>
        )}
      </div>
  );
};

export default WorkHoursTracker;
