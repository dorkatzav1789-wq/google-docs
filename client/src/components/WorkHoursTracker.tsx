import React, { useState, useEffect, useCallback } from 'react';
import type { Employee } from '../types';
import { employeesAPI, workHoursAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const WorkHoursTracker: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [workHours, setWorkHours] = useState({
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: 0,
    notes: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

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
        notes: workHours.notes,
      };

      await workHoursAPI.create(workHoursData);

      setWorkHours({
        work_date: new Date().toISOString().split('T')[0],
        hours_worked: 0,
        notes: '',
      });
      alert('יום העבודה נוסף בהצלחה!');
    } catch (error) {
      console.error('Error adding work hours:', error);
      alert('שגיאה בהוספת יום העבודה');
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
      </div>
  );
};

export default WorkHoursTracker;
