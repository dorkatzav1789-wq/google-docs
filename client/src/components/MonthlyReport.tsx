import React, { useEffect, useState } from 'react';
import type { MonthlyReport as MonthlyReportType } from '../types';
import { reportsAPI } from '../services/api';

export const MonthlyReport: React.FC = () => {
  const [report, setReport] = useState<MonthlyReportType | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await reportsAPI.getMonthly(selectedYear, selectedMonth);
      setReport(data);
    } catch (e) {
      console.error('Error loading report:', e);
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

          <div className="flex gap-4">
            {/* שנה */}
            <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="p-2 border rounded"
                title="בחר שנה"
                aria-label="בחר שנה"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* חודש */}
            <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="p-2 border rounded"
                title="בחר חודש"
                aria-label="בחר חודש"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* ייצוא PDF מהשרת */}
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-100 rounded">
            <h3 className="font-semibold">סה"כ שעות</h3>
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
        <table className="w-full border-collapse border">
          <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">עובד</th>
            <th className="border p-2">תאריך</th>
            <th className="border p-2">שעות</th>
            <th className="border p-2">שכר לשעה</th>
            <th className="border p-2">סה"כ ליום</th>
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
                    <td className="border p-2">{row.employees?.name || 'לא ידוע'}</td>
                    <td className="border p-2">{row.work_date}</td>
                    <td className="border p-2">{fmt(row.hours_worked)}</td>
                    <td className="border p-2">₪{fmt(row.hourly_rate)}</td>
                    <td className="border p-2">₪{fmt(row.daily_total)}</td>
                    <td className="border p-2">{row.notes || '-'}</td>
                  </tr>
              ))
          )}
          </tbody>
        </table>
      </div>
  );
};

export default MonthlyReport;
