import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { employeesAPI } from '../services/api';
import { WorkHoursTracker } from './WorkHoursTracker';
import { MonthlyReport } from './MonthlyReport';

type Tab = 'manage' | 'hours' | 'reports';

const EmployeesPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('manage');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    hourly_rate: 0,
  });

  useEffect(() => {
    if (tab === 'manage') loadEmployees();
  }, [tab]);

  const loadEmployees = async () => {
    try {
      const data = await employeesAPI.getAll();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading employees:', err);
      setEmployees([]);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeesAPI.create(newEmployee);
      setNewEmployee({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        hourly_rate: 0,
      });
      loadEmployees();
    } catch (err) {
      console.error('Error adding employee:', err);
    }
  };

  const fullName = (emp: Employee) =>
      (emp.first_name || emp.last_name)
          ? `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim()
          : (emp.name ?? 'ללא שם');

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
            {tab === 'manage' && (
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-6">ניהול עובדים</h2>

                  {/* טופס הוספת עובד */}
                  <form onSubmit={handleAddEmployee} className="mb-8 p-4 border rounded">
                    <h3 className="text-lg font-semibold mb-4">הוסף עובד חדש</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                          type="text"
                          placeholder="שם"
                          value={newEmployee.first_name}
                          onChange={(e) =>
                              setNewEmployee({ ...newEmployee, first_name: e.target.value })
                          }
                          className="p-2 border rounded"
                          required
                      />
                      <input
                          type="text"
                          placeholder="שם משפחה"
                          value={newEmployee.last_name}
                          onChange={(e) =>
                              setNewEmployee({ ...newEmployee, last_name: e.target.value })
                          }
                          className="p-2 border rounded"
                          required
                      />
                      <input
                          type="tel"
                          placeholder="טלפון"
                          value={newEmployee.phone}
                          onChange={(e) =>
                              setNewEmployee({ ...newEmployee, phone: e.target.value })
                          }
                          className="p-2 border rounded"
                      />
                      <input
                          type="email"
                          placeholder="אימייל"
                          value={newEmployee.email}
                          onChange={(e) =>
                              setNewEmployee({ ...newEmployee, email: e.target.value })
                          }
                          className="p-2 border rounded"
                      />
                      <input
                          type="number"
                          step="0.01"
                          placeholder="שכר לשעה"
                          value={newEmployee.hourly_rate}
                          onChange={(e) =>
                              setNewEmployee({
                                ...newEmployee,
                                hourly_rate: parseFloat(e.target.value) || 0,
                              })
                          }
                          className="p-2 border rounded"
                          required
                      />
                    </div>
                    <button
                        type="submit"
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                    >
                      הוסף עובד
                    </button>
                  </form>

                  {/* רשימת עובדים */}
                  <div className="grid gap-4">
                    {Array.isArray(employees) && employees.length > 0 ? (
                        employees.map((employee) => (
                            <div key={employee.id} className="p-4 border rounded">
                              <h4 className="font-semibold">{fullName(employee)}</h4>
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
            )}

            {tab === 'hours' && <WorkHoursTracker />}
            {tab === 'reports' && <MonthlyReport />}
          </div>
        </main>
      </div>
  );
};

export default EmployeesPage;
