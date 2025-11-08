import React, { useEffect, useState, useRef } from 'react';
import type { MonthlyReport as MonthlyReportType, WorkHours, Employee } from '../types';
import { reportsAPI, employeesAPI, workHoursAPI } from '../services/supabaseAPI';
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
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({
    work_date: '',
    event_type: 'business' as 'business' | 'personal',
    hours_worked: '',
    hourly_rate: '',
    overtime_amount: '',
    total_amount: '',
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';

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

  const startEditRow = (row: WorkHours) => {
    setEditingRowId(row.id);
    setEditDraft({
      work_date: row.work_date,
      event_type: row.event_type,
      hours_worked: String(row.hours_worked ?? 0),
      hourly_rate: String(row.hourly_rate ?? 0),
      overtime_amount: String(row.overtime_amount ?? 0),
      total_amount: String(row.total_amount ?? 0),
      notes: row.notes ?? '',
    });
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
    setEditDraft({
      work_date: '',
      event_type: 'business',
      hours_worked: '',
      hourly_rate: '',
      overtime_amount: '',
      total_amount: '',
      notes: '',
    });
  };

  const handleEditFieldChange = (field: keyof typeof editDraft, value: string) => {
    setEditDraft((prev) => {
      const next = {
        ...prev,
        [field]: field === 'event_type' ? (value as 'business' | 'personal') : value,
      };

      const hours = Number(field === 'hours_worked' ? value : next.hours_worked) || 0;
      const rate = Number(field === 'hourly_rate' ? value : next.hourly_rate) || 0;
      const overtime = Number(field === 'overtime_amount' ? value : next.overtime_amount) || 0;
      next.total_amount = String(hours * rate + overtime);
      return next;
    });
  };

  const saveEditRow = async () => {
    if (!editingRowId) return;

    try {
      setSavingEdit(true);
      await workHoursAPI.update(editingRowId, {
        work_date: editDraft.work_date,
        event_type: editDraft.event_type,
        hours_worked: Number(editDraft.hours_worked) || 0,
        hourly_rate: Number(editDraft.hourly_rate) || 0,
        overtime_amount: Number(editDraft.overtime_amount) || 0,
        total_amount: Number(editDraft.total_amount) || 0,
        notes: editDraft.notes.trim() ? editDraft.notes.trim() : null,
      });
      await loadReport();
      cancelEditRow();
    } catch (error) {
      console.error('Error updating work hours:', error);
      alert('שגיאה בעדכון שורת הדוח');
    } finally {
      setSavingEdit(false);
    }
  };

  const hideAdminColumns = (root: HTMLElement) => {
    const affected: Array<{ el: HTMLElement; display: string }> = [];
    root.querySelectorAll('.admin-actions-column').forEach((node) => {
      const el = node as HTMLElement;
      affected.push({ el, display: el.style.display });
      el.style.display = 'none';
    });
    return () => {
      affected.forEach(({ el, display }) => {
        el.style.display = display;
      });
    };
  };

  const exportDetailedPDFByEmployee = async () => {
    if (!reportRef.current || !report) return;
    
    try {
      setExporting(true);
      
      // Group work hours by employee
      const byEmployee = new Map<string, { name: string; business: WorkHours[]; personal: WorkHours[]; }>();
      
      report.work_hours.forEach(row => {
        const firstName = (row as any).employees?.first_name ?? '';
        const lastName = (row as any).employees?.last_name ?? '';
        const fullName = `${firstName} ${lastName}`.trim();
        const key = fullName || (row as any).employee_name || `#${row.employee_id}`;
        
        if (!byEmployee.has(key)) {
          byEmployee.set(key, { name: key, business: [], personal: [] });
        }
        
        const emp = byEmployee.get(key)!;
        if (row.event_type === 'business') {
          emp.business.push(row);
        } else {
          emp.personal.push(row);
        }
      });
      
      // Build detailed HTML
      const selectedEmployeeName = selectedEmployee 
        ? employees.find(emp => emp.id === selectedEmployee)?.first_name + ' ' + employees.find(emp => emp.id === selectedEmployee)?.last_name
        : '';
      
      const employeeSuffix = selectedEmployee ? `-${selectedEmployeeName?.trim()}` : '';
      const filename = `work-hours-detailed-${selectedYear}-${String(selectedMonth).padStart(2, '0')}${employeeSuffix}.pdf`;
      
      let detailedHTML = reportRef.current.innerHTML;
      
      // Replace the main table with employee-grouped content
      const tempContainer = document.createElement('div');
      
      let groupedTableHTML = '<div style="margin-top: 20px;">';
      
      byEmployee.forEach((empData, empName) => {
        const businessTotal = empData.business.reduce((sum, r) => sum + (r.total_amount || 0), 0);
        const personalTotal = empData.personal.reduce((sum, r) => sum + (r.total_amount || 0), 0);
        const overallTotal = businessTotal + personalTotal;
        
        groupedTableHTML += `
          <div style="margin-bottom: 40px; page-break-inside: avoid;">
            <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 10px;">${empName}</h3>
            
            <!-- Business Events -->
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 10px; color: #1e40af;">אירועים עסקיים</h4>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 15px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="border: 1px solid #000; padding: 8px;">תאריך</th>
                    <th style="border: 1px solid #000; padding: 8px;">ימים</th>
                    <th style="border: 1px solid #000; padding: 8px;">תשלום יומי</th>
                    <th style="border: 1px solid #000; padding: 8px;">שעות נוספות</th>
                    <th style="border: 1px solid #000; padding: 8px;">סה"כ</th>
                  </tr>
                </thead>
                <tbody>
                  ${empData.business.length > 0 ? empData.business.map(row => `
                    <tr>
                      <td style="border: 1px solid #000; padding: 8px;">${row.work_date}</td>
                      <td style="border: 1px solid #000; padding: 8px;">${fmt(row.hours_worked)}</td>
                      <td style="border: 1px solid #000; padding: 8px;">₪${fmt(row.hourly_rate)}</td>
                      <td style="border: 1px solid #000; padding: 8px;">${row.overtime_amount > 0 ? `+₪${fmt(row.overtime_amount)}` : '-'}</td>
                      <td style="border: 1px solid #000; padding: 8px;">₪${fmt(row.total_amount)}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: center;">אין אירועים עסקיים</td></tr>'}
                  <tr style="background-color: #dbeafe; font-weight: bold;">
                    <td colspan="4" style="border: 1px solid #000; padding: 8px;">סה"כ אירועים עסקיים</td>
                    <td style="border: 1px solid #000; padding: 8px;">₪${fmt(businessTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Personal Events -->
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 10px; color: #059669;">אירועים פרטיים</h4>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 15px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="border: 1px solid #000; padding: 8px;">תאריך</th>
                    <th style="border: 1px solid #000; padding: 8px;">ימים</th>
                    <th style="border: 1px solid #000; padding: 8px;">תשלום יומי</th>
                    <th style="border: 1px solid #000; padding: 8px;">שעות נוספות</th>
                    <th style="border: 1px solid #000; padding: 8px;">סה"כ</th>
                  </tr>
                </thead>
                <tbody>
                  ${empData.personal.length > 0 ? empData.personal.map(row => `
                    <tr>
                      <td style="border: 1px solid #000; padding: 8px;">${row.work_date}</td>
                      <td style="border: 1px solid #000; padding: 8px;">${fmt(row.hours_worked)}</td>
                      <td style="border: 1px solid #000; padding: 8px;">₪${fmt(row.hourly_rate)}</td>
                      <td style="border: 1px solid #000; padding: 8px;">${row.overtime_amount > 0 ? `+₪${fmt(row.overtime_amount)}` : '-'}</td>
                      <td style="border: 1px solid #000; padding: 8px;">₪${fmt(row.total_amount)}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: center;">אין אירועים פרטיים</td></tr>'}
                  <tr style="background-color: #d1fae5; font-weight: bold;">
                    <td colspan="4" style="border: 1px solid #000; padding: 8px;">סה"כ אירועים פרטיים</td>
                    <td style="border: 1px solid #000; padding: 8px;">₪${fmt(personalTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Employee Summary -->
            <div style="background-color: #f9fafb; padding: 15px; border: 2px solid #374151; border-radius: 8px; margin-top: 20px;">
              <h4 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">סיכום כספי - ${empName}</h4>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="padding: 5px; font-weight: 600;">אירועים עסקיים:</td>
                    <td style="padding: 5px; text-align: left;">₪${fmt(businessTotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px; font-weight: 600;">אירועים פרטיים:</td>
                    <td style="padding: 5px; text-align: left;">₪${fmt(personalTotal)}</td>
                  </tr>
                  <tr style="background-color: #e5e7eb;">
                    <td style="padding: 10px; font-weight: bold; font-size: 16px;">סה"כ לתשלום:</td>
                    <td style="padding: 10px; text-align: left; font-weight: bold; font-size: 18px;">₪${fmt(overallTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        `;
      });
      
      groupedTableHTML += '</div>';
      
      // Replace original table content
      const originalTableStart = detailedHTML.indexOf('<table');
      const originalSummaryStart = detailedHTML.indexOf('<div className="mt-6">');
      const originalSummaryEnd = detailedHTML.indexOf('</div>', originalSummaryStart) + 6;
      
      detailedHTML = detailedHTML.substring(0, originalTableStart) + 
                     groupedTableHTML + 
                     detailedHTML.substring(originalSummaryEnd);
      
      tempContainer.innerHTML = detailedHTML;
      document.body.appendChild(tempContainer);
      const restoreAdminColumns = hideAdminColumns(tempContainer);
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] }
      };
      
      await html2pdf().set(opt).from(tempContainer).save();
      
      // Cleanup
      restoreAdminColumns();
      if (tempContainer.parentElement) {
        document.body.removeChild(tempContainer);
      }
      
    } catch (e) {
      console.error('Detailed PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  };

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

      let restoreAdminColumns: (() => void) | null = null;

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

        document.body.appendChild(tempContainer);
        restoreAdminColumns = hideAdminColumns(tempContainer);
        contentToExport = tempContainer;
      }
      if (!tempContainer && isAdmin) {
        restoreAdminColumns = hideAdminColumns(contentToExport as HTMLElement);
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
      if (restoreAdminColumns) {
        restoreAdminColumns();
      }
      if (tempContainer && tempContainer.parentElement) {
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
            <button
                onClick={exportDetailedPDFByEmployee}
                disabled={exporting}
                className="px-4 py-2 bg-orange-500 text-white rounded"
                title="ייצא PDF מפורט לפי עובדים"
            >
              {exporting ? 'מייצא...' : 'PDF מפורט'}
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
            {isAdmin && <th className="border p-2 admin-actions-column">פעולות</th>}
          </tr>
          </thead>
          <tbody>
          {report.work_hours.length === 0 ? (
              <tr>
                <td className="border p-2 text-center text-gray-500" colSpan={isAdmin ? 9 : 8}>
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
                    <td className="border p-2">
                      {editingRowId === row.id ? (
                        <input
                          type="date"
                          value={editDraft.work_date}
                          onChange={(e) => handleEditFieldChange('work_date', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                        />
                      ) : (
                        row.work_date
                      )}
                    </td>
                    <td className="border p-2">
                      {editingRowId === row.id ? (
                        <select
                          value={editDraft.event_type}
                          onChange={(e) => handleEditFieldChange('event_type', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                        >
                          <option value="business">אירוע עסקי</option>
                          <option value="personal">אירוע פרטי</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            row.event_type === 'business'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {row.event_type === 'business' ? 'עסקי' : 'פרטי'}
                        </span>
                      )}
                    </td>
                    <td className="border p-2">
                      {editingRowId === row.id ? (
                        <input
                          type="number"
                          value={editDraft.hours_worked}
                          onChange={(e) => handleEditFieldChange('hours_worked', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                          step="0.1"
                        />
                      ) : (
                        fmt(row.hours_worked)
                      )}
                    </td>
                    <td className="border p-2">
                      {editingRowId === row.id ? (
                        <input
                          type="number"
                          value={editDraft.hourly_rate}
                          onChange={(e) => handleEditFieldChange('hourly_rate', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                          step="0.1"
                        />
                      ) : (
                        <>₪{fmt(row.hourly_rate)}</>
                      )}
                    </td>
                    <td className="border p-2">
                      {editingRowId === row.id ? (
                        <input
                          type="number"
                          value={editDraft.overtime_amount}
                          onChange={(e) => handleEditFieldChange('overtime_amount', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                          step="0.1"
                        />
                      ) : row.overtime_amount > 0 ? (
                        <span className="text-green-600 font-medium">+₪{fmt(row.overtime_amount)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="border p-2">
                      {editingRowId === row.id ? (
                        <>₪{fmt(Number(editDraft.total_amount) || 0)}</>
                      ) : (
                        <>₪{fmt(row.total_amount)}</>
                      )}
                    </td>
                    <td className="border p-2">
                      {editingRowId === row.id ? (
                        <input
                          type="text"
                          value={editDraft.notes}
                          onChange={(e) => handleEditFieldChange('notes', e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded"
                        />
                      ) : (
                        row.notes || '-'
                      )}
                    </td>
                    {isAdmin && (
                      <td className="border p-2 admin-actions-column">
                        {editingRowId === row.id ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEditRow}
                              className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                              disabled={savingEdit}
                            >
                              {savingEdit ? 'שומר...' : 'שמור'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditRow}
                              className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-sm"
                              disabled={savingEdit}
                            >
                              ביטול
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditRow(row)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                          >
                            עריכה
                          </button>
                        )}
                      </td>
                    )}
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
