import React, { useEffect, useState, useRef } from 'react';
import type { MonthlyReport as MonthlyReportType, WorkHours, Employee } from '../types';
import { reportsAPI, employeesAPI } from '../services/supabaseAPI';
import { useAuth } from '../context/AuthContext';
import html2pdf from 'html2pdf.js';

export const MonthlyReport: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<MonthlyReportType | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const normalizeReport = (data: any): MonthlyReportType => {
    const work_hours: WorkHours[] = Array.isArray(data?.work_hours)
        ? data.work_hours
        : Array.isArray(data)
            ? (data as WorkHours[])
            : [];

    // בונים employees אם לא הגיע מהשרת
    let employees: Employee[] = Array.isArray(data?.employees) ? data.employees : [];
    if (employees.length === 0 && work_hours.length > 0) {
      const map = new Map<string | number, Employee>();
      for (const wh of work_hours) {
        const key = (wh as any).employees?.first_name ?? (wh as any).employee_name ?? wh.employee_id;
        if (!map.has(key)) {
          const firstName = (wh as any).employees?.first_name ?? '';
          const lastName = (wh as any).employees?.last_name ?? '';
          const fullName = `${firstName} ${lastName}`.trim() || `#${wh.employee_id}`;
          
          map.set(key, {
            id: Number(wh.employee_id),
            name: fullName,
            phone: undefined,
            email: undefined,
            hourly_rate: Number((wh as any).employees?.hourly_rate ?? wh.hourly_rate ?? 0),
            is_active: true,
            created_at: '',
          });
        }
      }
      employees = Array.from(map.values());
    }

    const summary =
        data?.summary ?? {
          total_hours: work_hours.reduce((s, r) => s + Number(r.hours_worked || 0), 0),
          total_amount: work_hours.reduce((s, r) => s + Number(r.total_amount || 0), 0),
          employee_count: employees.length,
        };

    return { work_hours, employees, summary };
  };

  const loadEmployees = async () => {
    try {
      if (user?.role === 'admin') {
      const data = await employeesAPI.getAll();
      setEmployees(data || []);
      } else {
        const data = await employeesAPI.getCurrentUserEmployee();
        setEmployees(data ? [data] : []);
        if (data) {
          setSelectedEmployee(data.id);
        }
      }
    } catch (e) {
      console.error('Error loading employees:', e);
      setEmployees([]);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await reportsAPI.getMonthly(selectedYear, selectedMonth, selectedEmployee);
      setReport(normalizeReport(data));
    } catch (e) {
      console.error('Error loading report:', e);
      // ✅ מוסיפים גם employees כדי להתאים ל-Type
      setReport({
        work_hours: [],
        employees: [],
        summary: { total_hours: 0, total_amount: 0, employee_count: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, selectedEmployee]);

  const exportToPDF = async (eventType?: 'business' | 'personal') => {
    if (!reportRef.current) return;
    
    try {
      setExporting(true);
      
      const selectedEmployeeName = selectedEmployee 
        ? employees.find(emp => emp.id === selectedEmployee)?.first_name + ' ' + employees.find(emp => emp.id === selectedEmployee)?.last_name
        : '';
      
      const employeeSuffix = selectedEmployee ? `-${selectedEmployeeName?.trim()}` : '';
      const eventSuffix = eventType ? `-${eventType === 'business' ? 'עסקי' : 'פרטי'}` : '';
      const filename = `work-hours-report-${selectedYear}-${String(selectedMonth).padStart(2, '0')}${employeeSuffix}${eventSuffix}.pdf`;
      
      // Temporarily clone and filter the content if eventType is specified
      let contentToExport = reportRef.current;
      let tempContainer: HTMLDivElement | null = null;

      if (eventType) {
        tempContainer = document.createElement('div');
        tempContainer.innerHTML = reportRef.current.innerHTML;
        
        // Hide rows that don't match the event type
        const rows = tempContainer.querySelectorAll('tbody tr');
        let filteredTotal = 0;
        rows.forEach((row) => {
          const eventTypeCell = row.querySelector('td:nth-child(3) span');
          if (eventTypeCell) {
            const isBusiness = eventTypeCell.textContent?.includes('עסקי');
            const shouldHide = (eventType === 'business' && !isBusiness) || (eventType === 'personal' && isBusiness);
            if (shouldHide) {
              (row as HTMLElement).style.display = 'none';
            } else {
              // Calculate total for visible rows
              const totalCell = row.querySelector('td:nth-child(7)');
              if (totalCell) {
                const amountText = totalCell.textContent || '0';
                const amount = parseFloat(amountText.replace(/[₪,\s]/g, '')) || 0;
                filteredTotal += amount;
              }
            }
          }
        });

        // Hide the event summary table and add a simple filtered summary
        const summaryTable = tempContainer.querySelector('.mt-6');
        if (summaryTable) {
          (summaryTable as HTMLElement).style.display = 'none';
        }

        // Add filtered summary matching the original design
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'mt-6';
        summaryDiv.style.marginTop = '24px';
        const formattedTotal = filteredTotal.toLocaleString('he-IL', { maximumFractionDigits: 2 });
        summaryDiv.innerHTML = `
          <div>
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #1a202c;">סיכום ${eventType === 'business' ? 'אירועים עסקיים' : 'אירועים פרטיים'}:</h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
              <thead>
              <tr style="background-color: #f9fafb;">
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">סוג אירוע</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">סה"כ תשלום</th>
              </tr>
              </thead>
              <tbody>
              <tr>
                <td style="border: 1px solid #000; padding: 8px; font-weight: 500;">${eventType === 'business' ? 'אירועים עסקיים' : 'אירועים פרטיים'}</td>
                <td style="border: 1px solid #000; padding: 8px;">₪${formattedTotal}</td>
              </tr>
              </tbody>
            </table>
          </div>
        `;
        tempContainer.appendChild(summaryDiv);

        contentToExport = tempContainer;
      }
      
      const opt = {
        margin: 1,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(contentToExport).save();
      
      // Cleanup
      if (tempContainer) {
        document.body.removeChild(tempContainer);
      }
    } catch (e) {
      console.error('Export PDF failed:', e);
      
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="p-6">טוען...</div>;
  if (!report) return <div className="p-6">אין נתונים</div>;

  const fmt = (n: number | string | undefined | null) =>
      Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 });

  return (
      <div className="p-6">
        {/* כותרת ובחירה */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">דוח חודשי - {selectedMonth}/{selectedYear}</h2>

          <div className="flex gap-4 flex-wrap justify-center">
            <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="p-2 border rounded"
                title="בחר שנה"
                aria-label="בחר שנה"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="p-2 border rounded"
                title="בחר חודש"
                aria-label="בחר חודש"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {user?.role === 'admin' && (
            <select
                value={selectedEmployee ?? ''}
                onChange={(e) => setSelectedEmployee(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="p-2 border rounded"
                title="בחר עובד"
                aria-label="בחר עובד"
            >
              <option value="">כל העובדים</option>
              {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name && employee.last_name 
                      ? `${employee.first_name} ${employee.last_name}`.trim()
                      : employee.name || `עובד #${employee.id}`
                    }
                  </option>
              ))}
            </select>
            )}

            <button
                onClick={() => exportToPDF()}
                disabled={exporting}
                className="px-4 py-2 bg-green-500 text-white rounded"
            >
              {exporting ? 'מייצא...' : 'ייצוא ל-PDF'}
            </button>
            <button
                onClick={() => exportToPDF('business')}
                disabled={exporting}
                className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              {exporting ? 'מייצא...' : 'PDF עסקי'}
            </button>
            <button
                onClick={() => exportToPDF('personal')}
                disabled={exporting}
                className="px-4 py-2 bg-purple-500 text-white rounded"
            >
              {exporting ? 'מייצא...' : 'PDF פרטי'}
            </button>
          </div>
        </div>

        {/* סיכום עליון */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-100 rounded">
            <h3 className="font-semibold">סה"כ ימים</h3>
            <p className="text-2xl">{fmt(report.summary?.total_hours)}</p>
          </div>
          <div className="p-4 bg-green-100 rounded">
            <h3 className="font-semibold">סה"כ תשלום</h3>
            <p className="text-2xl">₪{fmt(report.summary?.total_amount)}</p>
          </div>
          <div className="p-4 bg-purple-100 rounded">
            <h3 className="font-semibold">סה"כ שעות נוספות</h3>
            <p className="text-2xl">₪{fmt(report.work_hours.reduce((sum, row) => sum + (row.overtime_amount || 0), 0))}</p>
          </div>
          <div className="p-4 bg-yellow-100 rounded">
            <h3 className="font-semibold">מספר עובדים</h3>
            <p className="text-2xl">{fmt(report.summary?.employee_count)}</p>
          </div>
        </div>

        {/* טבלת פירוט */}
        <div ref={reportRef} className="overflow-x-auto">
          {/* כותרת לדוח */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">דוח שעות עבודה</h1>
            <h2 className="text-xl text-gray-600">
              חודש {selectedMonth}/{selectedYear}
              {selectedEmployee && employees.find(emp => emp.id === selectedEmployee) && (
                <span className="block text-lg mt-1">
                  עובד: {employees.find(emp => emp.id === selectedEmployee)?.first_name} {employees.find(emp => emp.id === selectedEmployee)?.last_name}
                </span>
              )}
            </h2>
          </div>
          
          <table className="w-full border-collapse border min-w-full">
          <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">עובד</th>
            <th className="border p-2">תאריך</th>
            <th className="border p-2">סוג אירוע</th>
            <th className="border p-2">ימים</th>
            <th className="border p-2">תשלום יומי</th>
            <th className="border p-2">שעות נוספות</th>
            <th className="border p-2">סה"כ</th>
            <th className="border p-2">הערות</th>
          </tr>
          </thead>
          <tbody>
          {report.work_hours.length === 0 ? (
              <tr>
                <td className="border p-2 text-center text-gray-500" colSpan={8}>
                  אין נתונים לחודש שנבחר
                </td>
              </tr>
          ) : (
              report.work_hours.map((row) => (
                  <tr key={row.id}>
                    <td className="border p-2">
                      {(() => {
                        const firstName = (row as any).employees?.first_name ?? '';
                        const lastName = (row as any).employees?.last_name ?? '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        return fullName || (row as any).employee_name || `#${row.employee_id}`;
                      })()}
                    </td>
                    <td className="border p-2">{row.work_date}</td>
                    <td className="border p-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        row.event_type === 'business' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {row.event_type === 'business' ? 'עסקי' : 'פרטי'}
                      </span>
                    </td>
                    <td className="border p-2">{fmt(row.hours_worked)}</td>
                    <td className="border p-2">₪{fmt(row.hourly_rate)}</td>
                    <td className="border p-2">
                      {row.overtime_amount > 0 ? (
                        <span className="text-green-600 font-medium">+₪{fmt(row.overtime_amount)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="border p-2">₪{fmt(row.total_amount)}</td>
                    <td className="border p-2">{row.notes || '-'}</td>
                  </tr>
              ))
          )}
          </tbody>
        </table>

        {/* סיכום לפי סוג אירוע */}
        {report.work_hours.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">סיכום לפי סוג אירוע:</h3>
            <table className="w-full border-collapse border">
              <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-right">סוג אירוע</th>
                <th className="border p-2 text-left">סה"כ תשלום</th>
              </tr>
              </thead>
              <tbody>
              <tr>
                <td className="border p-2 font-medium">אירועים עסקיים</td>
                <td className="border p-2">₪{fmt(report.work_hours.filter(r => r.event_type === 'business').reduce((sum, r) => sum + (r.total_amount || 0), 0))}</td>
              </tr>
              <tr>
                <td className="border p-2 font-medium">אירועים פרטיים</td>
                <td className="border p-2">₪{fmt(report.work_hours.filter(r => r.event_type === 'personal').reduce((sum, r) => sum + (r.total_amount || 0), 0))}</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border p-2 font-bold">סה"כ</td>
                <td className="border p-2 font-bold">₪{fmt(report.summary.total_amount)}</td>
              </tr>
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
  );
};

export default MonthlyReport;
