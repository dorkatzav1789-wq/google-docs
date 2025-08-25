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

      // ✅ נרמול הפריטים: תרגום item_name -> name, item_description -> description
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
      
      // הצג את הקונטיינר ל-PDF
      element.style.display = 'block';
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `quote-${quoteData.quote.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };

      await html2pdf().set(opt).from(element).save();
      
      // הסתר את הקונטיינר אחרי הייצוא
      element.style.display = 'none';
      
      alert('PDF יוצא בהצלחה!');
    } catch (error) {
      console.error('שגיאה בייצוא PDF:', error);
      alert('שגיאה בייצוא PDF');
      
      // הסתר את הקונטיינר גם במקרה של שגיאה
      if (pdfRef.current) {
        pdfRef.current.style.display = 'none';
      }
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
        <div className="w-full mx-auto p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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

        {/* קונטיינר ל-PDF */}
        <div ref={pdfRef} className="bg-white p-8 max-w-4xl mx-auto" style={{ display: 'none' }}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">הצעת מחיר</h1>
            <p className="text-black/80">מספר הצעה: #{quote.id}</p>
          </div>

          {/* תמונה גדולה מעל פרטי האירוע */}
          <div className="text-center mb-8">
            <img src="/pdf1.png" alt="header-img" style={{ 
              maxWidth: '500px', 
              width: '100%', 
              height: 'auto',
              margin: '0 auto'
            }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* פרטי האירוע */}
            <div className="border border-gray-300 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4 text-gray-800">פרטי האירוע</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">שם האירוע:</span>
                  <div className="text-gray-800 font-semibold">{quote.event_name}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">תאריך:</span>
                  <div className="text-gray-800">{formatDate(quote.event_date)}</div>
                </div>
                {quote.event_hours && (
                    <div>
                      <span className="font-medium text-gray-700">שעות:</span>
                      <div className="text-gray-800">{quote.event_hours}</div>
                    </div>
                )}
                {quote.special_notes && (
                    <div>
                      <span className="font-medium text-gray-700">הערות מיוחדות:</span>
                      <div className="text-gray-800 bg-gray-50 p-2 rounded mt-1">{quote.special_notes}</div>
                    </div>
                )}
              </div>
            </div>

            {/* פרטי לקוח */}
            <div className="border border-gray-300 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4 text-gray-800">פרטי לקוח</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">שם:</span>
                  <div className="text-gray-800 font-semibold">{quote.client_name}</div>
                </div>
                {quote.client_company && (
                    <div>
                      <span className="font-medium text-gray-700">חברה:</span>
                      <div className="text-gray-800">{quote.client_company}</div>
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* טבלת פריטים */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4 text-gray-800">פריטי הצעה</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-right">שם הפריט</th>
                <th className="border border-gray-300 p-2 text-right">תיאור</th>
                <th className="border border-gray-300 p-2 text-right">מחיר יחידה</th>
                <th className="border border-gray-300 p-2 text-right">כמות</th>
                <th className="border border-gray-300 p-2 text-right">הנחה</th>
                <th className="border border-gray-300 p-2 text-right">סה"כ</th>
              </tr>
              </thead>
              <tbody>
              {items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2 font-medium">{item.name}</td>
                    <td className="border border-gray-300 p-2 text-sm text-gray-600">{item.description}</td>
                    <td className="border border-gray-300 p-2">{formatCurrency(item.unit_price)}</td>
                    <td className="border border-gray-300 p-2">{item.quantity}</td>
                    <td className="border border-gray-300 p-2">
                      {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                    </td>
                    <td className="border border-gray-300 p-2 font-bold">{formatCurrency(item.total)}</td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>

          {/* סיכום כספי */}
          <div className="border border-gray-300 rounded-lg p-4">
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

          {/* פרטי יצירה */}
          <div className="mt-8 text-sm text-gray-600 text-center">
            <div>נוצר ב: {formatDate(quote.created_at || '')}</div>
            <div>מספר פריטים: {items.length}</div>
          </div>

          {/* דף שני ל-PDF */}
          <div className="mt-16" style={{ pageBreakBefore: 'always' }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-black mb-2">אישור הזמנה</h2>
              <p className="text-black/80">תאריך: {formatDate(new Date().toISOString())}</p>
              {/* תמונה שנייה */}
              <div className="mt-4">
                <img src="/pdf2.png" alt="header-img" style={{maxWidth: '220px', height: 'auto'}}/>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-300 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4 text-gray-800">אישור הזמנה</h3>
                <p className="text-sm text-gray-700 mb-4">
                  אשר/י בחתימה שהפרטים לעיל מאושרים וכי ידוע לך שהמחירים אינם כוללים הובלה/עומסים חריגים אלא אם צוין אחרת.
                </p>
                <div className="space-y-4">
                  <div>
                    <span className="font-medium text-gray-700">שם מלא:</span>
                    <div className="border-b border-gray-300 mt-1 h-6"></div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">חתימה:</span>
                    <div className="border-b border-gray-300 mt-1 h-6"></div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">תאריך:</span>
                    <div className="text-gray-800">{formatDate(new Date().toISOString())}</div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-4 text-gray-800">פרטי תשלום</h3>
                <p className="text-sm text-gray-700">פרטי תשלום יסופקו לפי הצורך.</p>
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

        {/* תצוגה רגילה */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* פרטי הצעה */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold mb-4 text-gray-800">פרטי האירוע</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">שם האירוע:</span>
                  <div className="text-gray-800 font-semibold">{quote.event_name}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">תאריך:</span>
                  <div className="text-gray-800">{formatDate(quote.event_date)}</div>
                </div>
                {quote.event_hours && (
                    <div>
                      <span className="font-medium text-gray-700">שעות:</span>
                      <div className="text-gray-800">{quote.event_hours}</div>
                    </div>
                )}
                {quote.special_notes && (
                    <div>
                      <span className="font-medium text-gray-700">הערות מיוחדות:</span>
                      <div className="text-gray-800 bg-gray-50 p-2 rounded mt-1">{quote.special_notes}</div>
                    </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4 text-gray-800">פרטי לקוח</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">שם:</span>
                  <div className="text-gray-800 font-semibold">{quote.client_name}</div>
                </div>
                {quote.client_company && (
                    <div>
                      <span className="font-medium text-gray-700">חברה:</span>
                      <div className="text-gray-800">{quote.client_company}</div>
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

        {/* טבלת פריטים */}
        <div className="card mt-6">
          <h3 className="text-lg font-bold mb-4 text-gray-800">פריטי הצעה</h3>
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
