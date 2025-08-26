import React, { useState, useEffect, useRef } from 'react';
import { QuoteWithItems } from '../types';
import { quotesAPI } from '../services/api';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface QuoteDetailsProps {
  quoteId: number;
  onBack: () => void;
}

const QuoteDetails: React.FC<QuoteDetailsProps> = ({ quoteId, onBack }) => {
  const [quoteData, setQuoteData] = useState<QuoteWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const loadQuoteDetails = async () => {
    try {
      setLoading(true);
      const data = await quotesAPI.getById(quoteId);

      // נרמול פריטים (שם/תיאור)
      const normalizedItems = (data.items || []).map((it: any) => ({
        name: it.name ?? it.item_name ?? '',
        description: it.description ?? it.item_description ?? '',
        unit_price: Number(it.unit_price ?? 0),
        quantity: Number(it.quantity ?? 0),
        discount: Number(it.discount ?? 0),
        total: Number(it.total ?? 0),
      }));

      setQuoteData({ quote: data.quote, items: normalizedItems });
    } catch (error) {
      console.error('שגיאה בטעינת פרטי הצעה:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuoteDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  const formatCurrency = (amount: number) => `₪${amount.toLocaleString('he-IL')}`;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'לא צוין';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  const handleExportPDF = async () => {
    if (!quoteData || !pdfRef.current) return;

    try {
      setExportingPDF(true);

      const element = pdfRef.current;

      // html2canvas/ jsPDF אופציות
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `quote-${quoteData.quote.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: Math.min(window.devicePixelRatio || 2, 3),
          useCORS: true
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: { mode: ['css', 'avoid-all', 'legacy'] }
      } as const;

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('שגיאה בייצוא PDF:', error);
      alert('שגיאה בייצוא PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
        <div className="w-full mx-auto p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-white">טוען פרטי הצעה...</p>
          </div>
        </div>
    );
  }

  if (!quoteData) {
    return (
        <div className="w-full mx-auto p-6">
          <div className="text-center">
            <p className="text-white">הצעה לא נמצאה</p>
            <button onClick={onBack} className="btn-primary mt-4">חזור לרשימה</button>
          </div>
        </div>
    );
  }

  const { quote, items } = quoteData;

  return (
      <div className="w-full mx-auto p-6">
        {/* כותרת ופעולות */}
        <div className="mb-6">
          <button onClick={onBack} className="btn-secondary mb-4">← חזור לרשימה</button>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">פרטי הצעת מחיר</h1>
            <p className="text-black/80">הצעה #{quote.id}</p>
            <div className="mt-4">
              <button onClick={handleExportPDF} disabled={exportingPDF} className="btn-success ml-4">
                {exportingPDF ? 'מייצא...' : '📄 ייצא PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* ========= קונטיינר PDF (Offscreen) ========= */}
        <div
            ref={pdfRef}
            className="pdf-root bg-white p-8 max-w-4xl offscreen"
        >
          {/* סגנונות ייעודיים ל-PDF */}
          <style>
            {`
            .pdf-root {
              direction: rtl;
              font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
              color: #111;
              font-size: 12px;
              line-height: 1.5;
              width: 190mm;            /* מתאים ל-A4 (210mm פחות מרווחים) */
              margin: 0 auto;
            }
            .offscreen {
              position: fixed;
              left: -10000px;
              top: 0;
              visibility: hidden;
            }
            .box {
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              padding: 10px 12px;
              margin-bottom: 12px;
            }
            .cols {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .sec-title {
              margin: 0 0 6px;
              font-weight: 700;
              font-size: 12px;
              color: #333;
            }
            .kv {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0 6px;
              table-layout: fixed;
            }
            .kv th {
              text-align: right;
              width: 35%;
              white-space: nowrap;
              color: #555;
              font-weight: 600;
              padding: 0;
              vertical-align: top;
            }
            .kv td {
              font-weight: 700;
              color: #111;
              padding: 0;
              word-break: break-word;
            }

            /* טבלת פריטים */
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              direction: rtl;
              border: 1px solid #e0e0e0;
            }
            .invoice-table th,
            .invoice-table td {
              padding: 10px;
              text-align: center;
              border-bottom: 1px solid #e0e0e0;
            }
            .invoice-table thead th {
              background-color: #e9eef2;
              font-weight: bold;
              color: #333;
              border-bottom: 2px solid #d0d8e0;
            }
            .invoice-table tbody tr:nth-child(even) {
              background-color: #f5f8fa;
            }
            .item-description { text-align: right; }
            .item-title { font-weight: 700; font-size: 12px; }
            .item-details { color: #555; font-size: 11px; }

            .summary-row-green { background-color: #e6f3d8 !important; }
            .summary-row-orange { background-color: #fde8d7 !important; }
            .summary-row-green td, .summary-row-orange td { font-weight: bold; }

            .final-total { font-weight: bold; font-size: 14px; }
            .final-total td { border-top: 2px solid #333; border-bottom: none !important; }

            /* שמירת מספרים יפים ב-RTL */
            .num { direction: ltr; text-align: left; }
          `}
          </style>

          {/* לוגו/תמונות עליונות */}
          <div className="text-center mb-4">
            <img src="/pdf3.png" alt="header-img" style={{ maxWidth: '200px', width: '100%', height: 'auto', margin: '0 auto' }} />
          </div>
          <div className="text-center mb-8">
            <img src="/pdf1.png" alt="header-img" style={{ maxWidth: '600px', width: '100%', height: 'auto', margin: '0 auto' }} />
          </div>

          {/* פרטי אירוע + פרטי לקוח (Key/Value) */}
          <div className="box">
            <div className="cols">
              <div>
                <h3 className="sec-title">פרטי האירוע</h3>
                <table className="kv">
                  <tbody>
                  <tr><th>שם האירוע:</th><td>{quote.event_name}</td></tr>
                  <tr><th>תאריך:</th><td>{formatDate(quote.event_date)}</td></tr>
                  {quote.event_hours && <tr><th>שעות:</th><td>{quote.event_hours}</td></tr>}
                  {quote.special_notes && <tr><th>הערות מיוחדות:</th><td>{quote.special_notes}</td></tr>}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="sec-title">פרטי לקוח</h3>
                <table className="kv">
                  <tbody>
                  <tr><th>שם:</th><td>{quote.client_name}</td></tr>
                  {quote.client_company && <tr><th>חברה:</th><td>{quote.client_company}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* טבלת פריטים */}
          <div className="mb-8">
            <table className="invoice-table">
              <thead>
              <tr>
                <th style={{ width: '50%' }}>תיאור הפריט</th>
                <th>מחיר יחידה</th>
                <th>כמות</th>
                <th>הנחה</th>
                <th>סה"כ</th>
              </tr>
              </thead>
              <tbody>
              {items.map((item, index) => (
                  <tr key={index}>
                    <td className="item-description">
                      <div className="item-title">{item.name}</div>
                      <div className="item-details">{item.description}</div>
                    </td>
                    <td className="num">{formatCurrency(item.unit_price)}</td>
                    <td className="num">{item.quantity}</td>
                    <td className="num">{item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}</td>
                    <td className="num">{formatCurrency(item.total)}</td>
                  </tr>
              ))}

              <tr className="summary-row-green">
                <td className="item-description">סה"כ לפני הנחה</td>
                <td></td><td></td><td></td>
                <td className="num">{formatCurrency(quote.total_before_discount)}</td>
              </tr>

              {quote.discount_percent > 0 && (
                  <tr className="summary-row-orange">
                    <td className="item-description">הנחה ({quote.discount_percent}%)</td>
                    <td></td><td></td>
                    <td className="num">-{formatCurrency(quote.discount_amount)}</td>
                    <td className="num">-{formatCurrency(quote.discount_amount)}</td>
                  </tr>
              )}

              <tr className="summary-row-green">
                <td className="item-description">סה"כ לאחר הנחה</td>
                <td></td><td></td><td></td>
                <td className="num">{formatCurrency(quote.total_after_discount)}</td>
              </tr>

              <tr className="summary-row-orange">
                <td className="item-description">18% מע"מ</td>
                <td></td><td></td><td></td>
                <td className="num">{formatCurrency(quote.vat_amount)}</td>
              </tr>

              <tr className="final-total">
                <td className="item-description">סה"כ כולל מע"מ</td>
                <td></td><td></td><td></td>
                <td className="num">{formatCurrency(quote.final_total)}</td>
              </tr>
              </tbody>
            </table>
          </div>

          {/* דף שני */}
          <div className="mt-16" style={{ pageBreakBefore: 'always' }}>
            <div className="text-center mb-8">
              <img src="/pdf3.png" alt="header-img" style={{ maxWidth: '200px', width: '100%', height: 'auto', margin: '0 auto' }} />
              <div className="mt-4">
                <img src="/pdf2.png" alt="header-img" style={{ maxWidth: '620px', height: 'auto' }} />
              </div>
              <div className="mt-4 text-left">
                <img src="/pdf4.png" alt="header-img" style={{ maxWidth: '620px', height: 'auto', marginLeft: '20px', marginRight: 'auto' }} />
              </div>
            </div>

            <div className="mt-8 text-sm text-gray-600 text-center">
              <div><strong>בברכה,</strong> דור קצב</div>
              <div>מנהל מערכות מולטימדיה, תאורה, הגברה, מסכי לד</div>
              <div>📞 052-489-1025</div>
              <div>✉️ Dor.katzav.valley@gmail.com</div>
            </div>
          </div>
        </div>
        {/* ========= סוף קונטיינר PDF ========= */}

        {/* ===== תצוגה רגילה על המסך ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* פרטי הצעה */}
          <div className="space-y-3">
            <div className="card">
              <h3 className="text-sm font-bold mb-2 text-gray-800">פרטי האירוע</h3>
              <div className="space-y-1">
                <div>
                  <span className="font-medium text-gray-700 text-xs">שם האירוע:</span>
                  <div className="text-gray-800 font-semibold text-xs">{quote.event_name}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 text-xs">תאריך:</span>
                  <div className="text-gray-800 text-xs">{formatDate(quote.event_date)}</div>
                </div>
                {quote.event_hours && (
                    <div>
                      <span className="font-medium text-gray-700 text-xs">שעות:</span>
                      <div className="text-gray-800 text-xs">{quote.event_hours}</div>
                    </div>
                )}
                {quote.special_notes && (
                    <div>
                      <span className="font-medium text-gray-700 text-xs">הערות מיוחדות:</span>
                      <div className="text-gray-800 bg-gray-50 p-1 rounded mt-1 text-xs">{quote.special_notes}</div>
                    </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-bold mb-2 text-gray-800">פרטי לקוח</h3>
              <div className="space-y-1">
                <div>
                  <span className="font-medium text-gray-700 text-xs">שם:</span>
                  <div className="text-gray-800 font-semibold text-xs">{quote.client_name}</div>
                </div>
                {quote.client_company && (
                    <div>
                      <span className="font-medium text-gray-700 text-xs">חברה:</span>
                      <div className="text-gray-800 text-xs">{quote.client_company}</div>
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* סיכום כספי */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold mb-4 text-gray-800">סיכום כספי</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">סה"כ לפני הנחה:</span>
                  <span className="font-bold">{formatCurrency(quote.total_before_discount)}</span>
                </div>
                {quote.discount_percent > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-700">הנחה ({quote.discount_percent}%):</span>
                        <span className="font-bold text-red-600">-{formatCurrency(quote.discount_amount)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-700">סה"כ אחרי הנחה:</span>
                        <span className="font-bold">{formatCurrency(quote.total_after_discount)}</span>
                      </div>
                    </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-700">מע"מ (18%):</span>
                  <span className="font-bold text-blue-600">+{formatCurrency(quote.vat_amount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg">
                  <span className="font-bold text-gray-800">סה"כ כולל מע"מ:</span>
                  <span className="font-bold text-green-600 text-xl">{formatCurrency(quote.final_total)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4 text-gray-800">פרטי יצירה</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div><span className="font-medium">נוצר ב:</span> {formatDate(quote.created_at || '')}</div>
                <div><span className="font-medium">מספר פריטים:</span> {items.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* טבלת פריטים במסך */}
        <div className="card mt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
              <tr>
                <th className="table-header">שם הפריט</th>
                <th className="table-header">תיאור</th>
                <th className="table-header">מחיר יחידה</th>
                <th className="table-header">כמות</th>
                <th className="table-header">הנחה</th>
                <th className="table-header">סה"כ</th>
              </tr>
              </thead>
              <tbody>
              {items.map((item, index) => (
                  <tr key={index}>
                    <td className="table-cell font-medium">{item.name}</td>
                    <td className="table-cell text-sm text-gray-600">{item.description}</td>
                    <td className="table-cell">{formatCurrency(item.unit_price)}</td>
                    <td className="table-cell">{item.quantity}</td>
                    <td className="table-cell">
                      {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                    </td>
                    <td className="table-cell font-bold">{formatCurrency(item.total)}</td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
};

export default QuoteDetails;
