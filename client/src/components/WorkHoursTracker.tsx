import React, { useState, useEffect } from 'react';
import { Employee, WorkHours } from '../types';
import { employeesAPI, workHoursAPI } from '../services/api';

export const WorkHoursTracker: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [workHours, setWorkHours] = useState({
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: 0,
    notes: ''
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await employeesAPI.getAll();
      setEmployees(data);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleAddWorkHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      const employee = employees.find(emp => emp.id === selectedEmployee);
      const workHoursData = {
        employee_id: selectedEmployee,
        work_date: workHours.work_date,
        hours_worked: workHours.hours_worked,
        hourly_rate: employee!.hourly_rate,
        daily_total: workHours.hours_worked * employee!.hourly_rate,
        notes: workHours.notes
      };

      await workHoursAPI.create(workHoursData);
      setWorkHours({
        work_date: new Date().toISOString().split('T')[0],
        hours_worked: 0,
        notes: ''
      });
      alert('שעות העבודה נוספו בהצלחה!');
    } catch (error) {
      console.error('Error adding work hours:', error);
      alert('שגיאה בהוספת שעות העבודה');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">רישום שעות עבודה</h2>
      
      <form onSubmit={handleAddWorkHours} className="mb-8 p-4 border rounded">
        <div className="grid grid-cols-2 gap-4">
          <select
            value={selectedEmployee || ''}
            onChange={(e) => setSelectedEmployee(parseInt(e.target.value))}
            className="p-2 border rounded"
            required
            title="בחר עובד"
            aria-label="בחר עובד"
          >
            <option value="">בחר עובד</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name} (₪{employee.hourly_rate}/שעה)
              </option>
            ))}
          </select>
          
          <input
            type="date"
            value={workHours.work_date}
            onChange={(e) => setWorkHours({...workHours, work_date: e.target.value})}
            className="p-2 border rounded"
            required
          />
          
          <input
            type="number"
            step="0.5"
            placeholder="שעות עבודה"
            value={workHours.hours_worked}
            onChange={(e) => setWorkHours({...workHours, hours_worked: parseFloat(e.target.value)})}
            className="p-2 border rounded"
            required
          />
          
          <input
            type="text"
            placeholder="הערות"
            value={workHours.notes}
            onChange={(e) => setWorkHours({...workHours, notes: e.target.value})}
            className="p-2 border rounded"
            title="הערות"
            aria-label="הערות"
          />
        </div>
        
        <button type="submit" className="mt-4 px-4 py-2 bg-green-500 text-white rounded">
          הוסף שעות עבודה
        </button>
      </form>
    </div>
  );
};
