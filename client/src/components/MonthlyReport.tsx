import React, { useState, useEffect } from 'react';
import { MonthlyReport } from '../types';
import { reportsAPI } from '../services/api';

export const MonthlyReport: React.FC = () => {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const loadReport = async () => {
    try {
      const data = await reportsAPI.getMonthly(selectedYear, selectedMonth);
      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedYear, selectedMonth]);

  const exportToPDF = () => {
    if (!report) return;
    
    // יצירת תוכן ה-PDF
    const content = `
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>דוח שעות עבודה - ${selectedMonth}/${selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 20px; }
            .summary-item { margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>דוח שעות עבודה</h1>
            <h2>חודש: ${selectedMonth}/${selectedYear}</h2>
          </div>
          
          <div class="summary">
            <div class="summary-item">סה"כ שעות: ${report.summary.total_hours}</div>
            <div class="summary-item">סה"כ תשלום: ₪${report.summary.total_amount}</div>
            <div class="summary-item">מספר עובדים: ${report.summary.employee_count}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>עובד</th>
                <th>תאריך</th>
                <th>שעות</th>
                <th>שכר לשעה</th>
                <th>סה"כ ליום</th>
                <th>הערות</th>
              </tr>
            </thead>
            <tbody>
              ${report.work_hours.map(hour => `
                <tr>
                  <td>${hour.employees?.name || 'לא ידוע'}</td>
                  <td>${hour.work_date}</td>
                  <td>${hour.hours_worked}</td>
                  <td>₪${hour.hourly_rate}</td>
                  <td>₪${hour.daily_total}</td>
                  <td>${hour.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // יצירת PDF
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `work-hours-report-${selectedYear}-${selectedMonth}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!report) return <div>טוען...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">דוח חודשי - {selectedMonth}/{selectedYear}</h2>
        <div className="flex gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="p-2 border rounded"
            title="בחר שנה"
            aria-label="בחר שנה"
          >
            {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="p-2 border rounded"
            title="בחר חודש"
            aria-label="בחר חודש"
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            ייצוא ל-PDF
          </button>
        </div>
      </div>

      {/* סיכום */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-100 rounded">
          <h3 className="font-semibold">סה"כ שעות</h3>
          <p className="text-2xl">{report.summary.total_hours}</p>
        </div>
        <div className="p-4 bg-green-100 rounded">
          <h3 className="font-semibold">סה"כ תשלום</h3>
          <p className="text-2xl">₪{report.summary.total_amount}</p>
        </div>
        <div className="p-4 bg-yellow-100 rounded">
          <h3 className="font-semibold">מספר עובדים</h3>
          <p className="text-2xl">{report.summary.employee_count}</p>
        </div>
      </div>

      {/* טבלת פרטים */}
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
          {report.work_hours.map(hour => (
            <tr key={hour.id}>
              <td className="border p-2">{hour.employees?.name || 'לא ידוע'}</td>
              <td className="border p-2">{hour.work_date}</td>
              <td className="border p-2">{hour.hours_worked}</td>
              <td className="border p-2">₪{hour.hourly_rate}</td>
              <td className="border p-2">₪{hour.daily_total}</td>
              <td className="border p-2">{hour.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
