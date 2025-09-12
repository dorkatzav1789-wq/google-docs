import React, { useEffect, useState } from 'react';
import type { MonthlyReport as MonthlyReportType, WorkHours, Employee } from '../types';
import { reportsAPI } from '../services/supabaseAPI';

export const MonthlyReport: React.FC = () => {
  const [report, setReport] = useState<MonthlyReportType | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

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
        const key = (wh as any).employees?.name ?? (wh as any).employee_name ?? wh.employee_id;
        if (!map.has(key)) {
          map.set(key, {
            id: Number(wh.employee_id),
            name: (wh as any).employees?.name ?? (wh as any).employee_name ?? `#${wh.employee_id}`,
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

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await reportsAPI.getMonthly(selectedYear, selectedMonth);
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
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth]);

  const exportToPDF = async () => {
    try {
      setExporting(true);
      const blob = await reportsAPI.exportMonthlyPdf(selectedYear, selectedMonth);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work-hours-report-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export PDF failed:', e);
      alert('שגיאה ביצוא PDF');
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

            <button
                onClick={exportToPDF}
                disabled={exporting}
                className="px-4 py-2 bg-green-500 text-white rounded"
            >
              {exporting ? 'מייצא...' : 'ייצוא ל-PDF'}
            </button>
          </div>
        </div>

        {/* סיכום עליון */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-100 rounded">
            <h3 className="font-semibold">סה"כ ימים</h3>
            <p className="text-2xl">{fmt(report.summary?.total_hours)}</p>
          </div>
          <div className="p-4 bg-green-100 rounded">
            <h3 className="font-semibold">סה"כ תשלום</h3>
            <p className="text-2xl">₪{fmt(report.summary?.total_amount)}</p>
          </div>
          <div className="p-4 bg-yellow-100 rounded">
            <h3 className="font-semibold">מספר עובדים</h3>
            <p className="text-2xl">{fmt(report.summary?.employee_count)}</p>
          </div>
        </div>

        {/* טבלת פירוט */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border min-w-full">
          <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">עובד</th>
            <th className="border p-2">תאריך</th>
            <th className="border p-2">ימים</th>
            <th className="border p-2">תשלום יומי</th>
            <th className="border p-2">סה"כ</th>
            <th className="border p-2">הערות</th>
          </tr>
          </thead>
          <tbody>
          {report.work_hours.length === 0 ? (
              <tr>
                <td className="border p-2 text-center text-gray-500" colSpan={6}>
                  אין נתונים לחודש שנבחר
                </td>
              </tr>
          ) : (
              report.work_hours.map((row) => (
                  <tr key={row.id}>
                    <td className="border p-2">
                      {(row as any).employees?.name ?? (row as any).employee_name ?? `#${row.employee_id}`}
                    </td>
                    <td className="border p-2">{row.work_date}</td>
                    <td className="border p-2">{fmt(row.hours_worked)}</td>
                    <td className="border p-2">₪{fmt(row.hourly_rate)}</td>
                    <td className="border p-2">₪{fmt(row.total_amount)}</td>
                    <td className="border p-2">{row.notes || '-'}</td>
                  </tr>
              ))
          )}
          </tbody>
        </table>
        </div>
      </div>
  );
};

export default MonthlyReport;
