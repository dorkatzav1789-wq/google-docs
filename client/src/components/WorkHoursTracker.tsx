import React, { useState, useEffect } from 'react';
import type { Employee } from '../types';
import { employeesAPI, workHoursAPI } from '../services/api';

export const WorkHoursTracker: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [workHours, setWorkHours] = useState({
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: 0,
    notes: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeesAPI.getAll();
      // נרמול תשובה — תמיד למערך
      const normalized = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];
      setEmployees(normalized);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

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

      const hours = Number(workHours.hours_worked || 0);
      const rate = Number(employee.daily_rate || 0);

      const workHoursData = {
        employee_id: selectedEmployee,
        work_date: workHours.work_date,
        hours_worked: hours,
        daily_rate: rate,
        notes: workHours.notes,
      };

      await workHoursAPI.create(workHoursData);

      setWorkHours({
        work_date: new Date().toISOString().split('T')[0],
        hours_worked: 0,
        notes: '',
      });
      alert('שעות העבודה נוספו בהצלחה!');
    } catch (error) {
      console.error('Error adding work hours:', error);
      alert('שגיאה בהוספת שעות העבודה');
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
        <h2 className="text-2xl font-bold mb-6">רישום שעות עבודה</h2>

        <form onSubmit={handleAddWorkHours} className="mb-8 p-4 border rounded">
          <div className="grid grid-cols-2 gap-4">
            <select
                value={selectedEmployee ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedEmployee(v ? parseInt(v, 10) : null);
                }}
                className="p-2 border rounded"
                required
                title="בחר עובד"
                aria-label="בחר עובד"
                disabled={loading}
            >
              <option value="">בחר עובד</option>
              {(employees ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {fullName(employee)} (₪
                    {Number(employee.daily_rate || 0).toLocaleString('he-IL')}/יום)
                  </option>
              ))}
            </select>

            <input
                type="date"
                value={workHours.work_date}
                onChange={(e) =>
                    setWorkHours({ ...workHours, work_date: e.target.value })
                }
                className="p-2 border rounded"
                required
                title="תאריך עבודה"
                aria-label="תאריך עבודה"
            />

            <input
                type="number"
                step="0.5"
                min="0"
                placeholder="שעות עבודה"
                value={workHours.hours_worked}
                onChange={(e) =>
                    setWorkHours({
                      ...workHours,
                      hours_worked: Number.isNaN(parseFloat(e.target.value))
                          ? 0
                          : parseFloat(e.target.value),
                    })
                }
                className="p-2 border rounded"
                required
            />

            <input
                type="text"
                placeholder="הערות"
                value={workHours.notes}
                onChange={(e) => setWorkHours({ ...workHours, notes: e.target.value })}
                className="p-2 border rounded"
                title="הערות"
                aria-label="הערות"
            />
          </div>

          <button
              type="submit"
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded"
              disabled={submitting || loading}
          >
            {submitting ? 'שומר...' : 'הוסף שעות עבודה'}
          </button>
        </form>

        {loading && <div className="text-gray-500">טוען עובדים...</div>}
        {!loading && (employees ?? []).length === 0 && (
            <div className="text-gray-600">אין עובדים במערכת עדיין.</div>
        )}
      </div>
  );
};

export default WorkHoursTracker;
