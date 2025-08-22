import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { employeesAPI } from '../services/api';

export const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    phone: '',
    email: '',
    hourly_rate: 0
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await employeesAPI.getAll();
      // נרמול: אם לא קיבלנו מערך – נהפוך למערך ריק
      const normalized = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];
      setEmployees(normalized);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]); // שלא ייפול ב-render
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeesAPI.create(newEmployee);
      setNewEmployee({ name: '', phone: '', email: '', hourly_rate: 0 });
      loadEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">ניהול עובדים</h2>
      
      {/* טופס הוספת עובד */}
      <form onSubmit={handleAddEmployee} className="mb-8 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-4">הוסף עובד חדש</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="שם העובד"
            value={newEmployee.name}
            onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
            className="p-2 border rounded"
            required
          />
          <input
            type="tel"
            placeholder="טלפון"
            value={newEmployee.phone}
            onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            type="email"
            placeholder="אימייל"
            value={newEmployee.email}
            onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            type="number"
            step="0.01"
            placeholder="שכר לשעה"
            value={newEmployee.hourly_rate}
            onChange={(e) => setNewEmployee({...newEmployee, hourly_rate: parseFloat(e.target.value)})}
            className="p-2 border rounded"
            required
          />
        </div>
        <button type="submit" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          הוסף עובד
        </button>
      </form>

      {/* רשימת עובדים */}
      <div className="grid gap-4">
        {Array.isArray(employees) && employees.length > 0 ? (
            employees.map((employee) => (
                <div key={employee.id} className="p-4 border rounded">
                  <h4 className="font-semibold">{employee.name}</h4>
                  <p>טלפון: {employee.phone || 'לא צוין'}</p>
                  <p>אימייל: {employee.email || 'לא צוין'}</p>
                  <p>שכר לשעה: ₪{employee.hourly_rate}</p>
                </div>
            ))
        ) : (
            <div className="p-4 border rounded text-gray-600">
              אין עובדים להצגה כרגע
            </div>
        )}
      </div>

    </div>
  );
};
