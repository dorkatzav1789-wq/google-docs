import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QuoteWithItems } from '../types';
import { quotesAPI } from '../services/supabaseAPI';
import ReminderManager from './ReminderManager';
import SplitModal from './SplitModal';
import { useTheme } from '../context/ThemeContext';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface QuoteDetailsProps {
  quoteId: number;
  onBack: () => void;
}

const QuoteDetails: React.FC<QuoteDetailsProps> = ({ quoteId, onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const [quoteData, setQuoteData] = useState<QuoteWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showReminderManager, setShowReminderManager] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    unit_price: 0,
    quantity: 1,
    discount: 0
  });
  const pdfRef = useRef<HTMLDivElement>(null);

  const startEdit = (index: number) => {
    const item = quoteData?.items[index];
    if (item) {
      setEditingItem(index);
      setEditForm({
        name: item.name,
        description: item.description,
        unit_price: item.unit_price,
        quantity: item.quantity,
        discount: item.discount
      });
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditForm({
      name: '',
      description: '',
      unit_price: 0,
      quantity: 1,
      discount: 0
    });
  };

  const saveEdit = async () => {
    if (editingItem === null || !quoteData) return;
    
    try {
      const updatedItems = [...quoteData.items];
      const item = updatedItems[editingItem];
      
      // עדכון הפריט
      item.name = editForm.name;
      item.description = editForm.description;
      item.unit_price = editForm.unit_price;
      item.quantity = editForm.quantity;
      item.discount = editForm.discount;
      item.total = (editForm.unit_price * editForm.quantity) - editForm.discount;
      
      // עדכון במסד הנתונים
      await quotesAPI.updateItem(item.id, {
        item_name: editForm.name,
        item_description: editForm.description,
        unit_price: editForm.unit_price,
        quantity: editForm.quantity,
        discount: editForm.discount,
        total: item.total
      });
      
      setQuoteData({ ...quoteData, items: updatedItems });
      setEditingItem(null);
      alert('הפריט עודכן בהצלחה!');
    } catch (error) {
      console.error('שגיאה בעדכון פריט:', error);
      alert('שגיאה בעדכון הפריט');
    }
  };

  const loadQuoteDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await quotesAPI.getById(quoteId);
      console.log('Data from getById:', data); // לוג לבדיקה

      // ✅ נרמול הפריטים: תרגום item_name -> name, item_description -> description
      const allItems = data.items || [];
      console.log('All items from data:', allItems); // לוג לבדיקה
      
      // הפרדת פריטים רגילים מפיצולים
      console.log('All items before filtering:', allItems); // לוג לבדיקה
      const regularItems = allItems.filter((it: any) => !it.name?.startsWith('פיצול '));
      const splitItems = allItems.filter((it: any) => it.name?.startsWith('פיצול '));
      console.log('Regular items after filtering:', regularItems); // לוג לבדיקה
      
      // יצירת מפה של פיצולים לפי מיקום (פשוט יותר)
      const splitsMap: { [key: number]: any[] } = {};
      
      // נניח שהפיצולים באים אחרי הפריט הרגיל (לפי סדר)
      let currentItemIndex = 0;
      splitItems.forEach((split: any) => {
        if (currentItemIndex < regularItems.length) {
          if (!splitsMap[currentItemIndex]) {
            splitsMap[currentItemIndex] = [];
          }
          splitsMap[currentItemIndex].push({
            name: split.name,
            description: split.description,
            unit_price: Number(split.unit_price),
            quantity: Number(split.quantity),
            discount: Number(split.discount),
            total: Number(split.total),
          });
        }
        currentItemIndex++;
      });
      
      const normalizedItems = regularItems.map((it: any, index: number) => {
        console.log('Normalizing item:', { 
          original: it, 
          name: it.name, 
          description: it.description 
        }); // לוג לבדיקה
        return {
          name: it.name ?? '',
          description: it.description ?? '',
          unit_price: Number(it.unit_price ?? 0),
          quantity: Number(it.quantity ?? 0),
          discount: Number(it.discount ?? 0),
          total: Number(it.total ?? 0),
          splits: splitsMap[index] || [],
        };
      });
      
      console.log('Final normalizedItems:', normalizedItems); // לוג לבדיקה

      setQuoteData({ quote: data.quote, items: normalizedItems });
    } catch (error) {
      console.error('שגיאה בטעינת פרטי הצעה:', error);
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    loadQuoteDetails();
  }, [quoteId, loadQuoteDetails]);

  const formatCurrency = (amount: number) => `₪${amount.toLocaleString('he-IL')}`;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'לא צוין';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  const handleAddSplit = (itemIndex: number) => {
    setSelectedItemIndex(itemIndex);
    setShowSplitModal(true);
  };

  const handleSelectSplit = async (splitType: string) => {
    if (!quoteData || selectedItemIndex === null) return;

    try {
      // הוספת פיצול חדש למסד הנתונים
      await quotesAPI.addSplit(quoteId, selectedItemIndex, splitType);
      
      // הוספת הפיצול לפריט הנוכחי ב-UI
      const newSplit = {
        name: `פיצול ${splitType}`,
        description: '',
        unit_price: 0,
        quantity: 1,
        discount: 0,
        total: 0
      };

      // עדכון הפריט עם הפיצול החדש
      const updatedItems = [...items];
      if (!updatedItems[selectedItemIndex].splits) {
        updatedItems[selectedItemIndex].splits = [];
      }
      updatedItems[selectedItemIndex].splits!.push(newSplit);
      
      setQuoteData({
        ...quoteData,
        items: updatedItems
      });
      
      setShowSplitModal(false);
      setSelectedItemIndex(null);
      
      alert(`פיצול ${splitType} נוסף בהצלחה!`);
    } catch (error) {
      console.error('שגיאה בהוספת פיצול:', error);
      alert('שגיאה בהוספת פיצול');
    }
  };

  const handleDeleteSplit = async (itemIndex: number, splitIndex: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הפיצול?')) {
      return;
    }

    if (!quoteData) return;

    const splitToDelete = items[itemIndex].splits![splitIndex];
    
    try {
      // מחיקת הפיצול מהמסד הנתונים
      await quotesAPI.deleteSplit(quoteId, splitToDelete.name);
      
      // עדכון ה-UI
      const updatedItems = [...items];
      if (updatedItems[itemIndex].splits) {
        updatedItems[itemIndex].splits!.splice(splitIndex, 1);
        
        setQuoteData({
          ...quoteData,
          items: updatedItems
        });
      }
      
      alert('פיצול נמחק בהצלחה!');
    } catch (error) {
      console.error('שגיאה במחיקת פיצול:', error);
      alert('שגיאה במחיקת פיצול');
    }
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
        filename: `${quoteData.quote.event_name}_${quoteData.quote.client_company}_${formatDate(quoteData.quote.event_date)}.pdf`,
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
        },
        pagebreak: {
          mode: ['css', 'avoid-all'],
          avoid: '.avoid-page-break'
        },
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
  const exportDate = new Date().toLocaleDateString('he-IL');

  const hasDiscount =
      (Number(quote.discount_percent) || 0) > 0 ||
      (Number(quote.discount_amount) || 0) > 0;

  return (
      <div className="w-full mx-auto p-6 bg-white dark:bg-gray-900 min-h-screen">
        <div className="mb-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm mb-4" aria-label="Breadcrumb">
            <button 
              onClick={onBack} 
              className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              הצעות מחיר
            </button>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-600 dark:text-gray-300">פרטי הצעה #{quote.id}</span>
          </nav>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="btn-secondary">← חזור לרשימה</button>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={theme === 'light' ? 'מעבר למצב כהה' : 'מעבר למצב בהיר'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">פרטי הצעת מחיר</h1>
            <p className="text-black/80 dark:text-white/80">הצעה #{quote.id}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={handleExportPDF} disabled={exportingPDF} className="btn-success">
                {exportingPDF ? 'מייצא...' : '📄 ייצא PDF'}
              </button>
              <button 
                onClick={() => setShowReminderManager(true)} 
                className="btn-primary"
              >
                🔔 ניהול תזכורות
              </button>
            </div>
          </div>
        </div>

        {/* קונטיינר ל-PDF */}
        <div ref={pdfRef} className="bg-white p-8 max-w-4xl mx-auto" style={{display: 'none'}}>
          {/* --- פס עליון: תאריך הפקה בצד שמאל --- */}
          <div className="w-full mb-2">
            <div className="text-sm text-gray-600" style={{textAlign: 'left'}}>
              {exportDate}
            </div>
          </div>

          {/* כותרת עם תמונה */}
          <div className="text-center mb-4">
            <img src="/pdf3.png" alt="header-img" style={{
              maxWidth: '200px',
              width: '100%',
              height: 'auto',
              margin: '0 auto'
            }}/>
          </div>

          {/* תמונה גדולה מעל פרטי האירוע */}
          <div className="text-center mb-6">
            <img src="/pdf1.png" alt="header-img" style={{
              maxWidth: '600px',
              width: '100%',
              height: 'auto',
              margin: '0 auto'
            }}/>
          </div>

          {/* --- כותרת שם האירוע מחוץ ל-border --- */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">{quote.event_name}</h2>
          </div>

          {/* עיצוב מותאם ל-PDF */}
          <style>{`
        .pdf-event-card {
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          padding: 24px;
          margin-bottom: 16px;
        }
        .pdf-card-content { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .pdf-section { display: flex; flex-direction: column; }
        .pdf-section-title {
          font-size: 14px; font-weight: 700; color: #1a202c;
          margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;
        }
        .pdf-field { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .pdf-field:last-child { margin-bottom: 0; }
        .pdf-label { font-size: 11px; color: #718096; }
        .pdf-value { font-size: 11px; font-weight: 500; color: #2d3748; }
        .pdf-special-notes { margin-top: 12px; }
        .pdf-special-notes .pdf-label { margin-bottom: 6px; display: block; }
        .pdf-special-notes .pdf-value {
          background-color: #f7fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;
          font-size: 10px; line-height: 1.4;
        }
        .ltr { direction: ltr; unicode-bidi: bidi-override; text-align: left; }
      `}</style>

          {/* --- כרטיס פרטי אירוע/לקוח (שם האירוע הוצא החוצה) --- */}
          <div className="pdf-event-card">
            <div className="pdf-card-content">
              {/* צד ימין: פרטי אירוע */}
              <div className="pdf-section">
                <h3 className="pdf-section-title">פרטי האירוע</h3>

                {/* שם האירוע הוסר מכאן */}
                <div className="pdf-field">
                  <span className="pdf-label">תאריך:</span>
                  <span className="pdf-value">{formatDate(quote.event_date)}</span>
                </div>

                {quote.event_hours && (
                    <div className="pdf-field">
                      <span className="pdf-label">שעות:</span>
                      <span className="pdf-value">{quote.event_hours}</span>
                    </div>
                )}
                {!!quote.client_company_id && (
                    <div className="pdf-field">
                      <span className="pdf-label">ח״פ:</span>
                      <span className="pdf-value ltr">{quote.client_company_id}</span>
                    </div>
                )}
                {quote.special_notes && (
                    <div className="pdf-special-notes">
                      <span className="pdf-label">הערות מיוחדות:</span>
                      <div className="pdf-value">{quote.special_notes}</div>
                    </div>
                )}
              </div>

              <div className="pdf-section">
                <h3 className="pdf-section-title">פרטי לקוח</h3>
                <div className="pdf-field">
                  <span className="pdf-label">שם:</span>
                  <span className="pdf-value">{quote.client_name}</span>
                </div>

                {!!quote.client_company && (
                    <div className="pdf-field">
                      <span className="pdf-label">חברה:</span>
                      <span className="pdf-value">{quote.client_company}</span>
                    </div>
                )}

                {!!quote.client_phone && (
                    <div className="pdf-field">
                      <span className="pdf-label">טלפון:</span>
                      <span className="pdf-value ltr">{quote.client_phone}</span>
                    </div>
                )}

              </div>
            </div>
          </div>

          {/* טבלת פריטים */}
          <div className="mb-8">

            <style>
              {`
                @import url('https://fonts.googleapis.com/css2?family=Arial&display=swap');
                
                .invoice-table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 13px;
                  direction: rtl;
                  font-family: Arial, sans-serif;
                  border: none;
                }
                
                .ltr {
                  direction: ltr;
                  unicode-bidi: bidi-override;
                  text-align: left;
                }
                
                .invoice-table th,
                .invoice-table td {
                  padding: 12px 10px;
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
                
                .invoice-table .item-description {
                  text-align: right;
                }
                
                .item-description .item-title {
                  font-weight: bold;
                  font-size: 11px;
                }
                
                .item-description .item-details {
                  color: #555;
                  font-size: 10px;
                }
                
                .summary-row-green {
                  background-color: #e6f3d8 !important;
                }
                
                .summary-row-orange {
                  background-color: #fde8d7 !important;
                }
                
                .summary-row-green td, .summary-row-orange td {
                  font-weight: bold;
                }
                
                .final-total {
                  font-weight: bold;
                  font-size: 14px;
                }
                
                .final-total td {
                  border-top: none;
                  border-bottom: none !important;
                }
                
                /* פיצולים יוצגו בצורה קומפקטית יותר */
                .split-row .item-description {
                  font-size: 10px;
                  padding-left: 15px;
                }
                
                .split-row .item-title {
                  font-size: 10px;
                  color: #0066cc;
                }
                
                .split-row .item-details {
                  font-size: 9px;
                }
                
                /* אם יש יותר מ-6 פריטים, קטן את הטקסט */
                .invoice-table.compact {
                  font-size: 11px;
                }
                
                .invoice-table.compact th,
                .invoice-table.compact td {
                  padding: 8px 6px;
                }
                
                .invoice-table.compact thead th {
                  font-size: 10px;
                }
                
                .invoice-table.compact .item-description .item-title {
                  font-size: 9px;
                  line-height: 1.2;
                }
                
                .invoice-table.compact .item-description .item-details {
                  font-size: 8px;
                  line-height: 1.2;
                }
                .avoid-page-break {
  break-inside: avoid;
  page-break-inside: avoid;
}
.avoid-page-break table,
.avoid-page-break tr,
.avoid-page-break td,
.avoid-page-break th {
  break-inside: avoid;
  page-break-inside: avoid;
}
* צבעים קיימים */
.summary-row-green { background-color: #e6f3d8 !important; }
.summary-row-orange { background-color: #fde8d7 !important; }
.summary-row-green td, .summary-row-orange td { font-weight: bold; }

/* רצוי שהשורה הסופית תהיה בלי קו למעלה */
.final-total td { border-top: none; }
                
                .invoice-table.compact .summary-row-green td, 
                .invoice-table.compact .summary-row-orange td {
                  font-size: 10px;
                }
                
                .invoice-table.compact .final-total {
                  font-size: 12px;
                }
                
                .invoice-table.compact .split-row .item-description {
                  font-size: 8px;
                  padding-left: 10px;
                }
                
                .invoice-table.compact .split-row .item-title {
                  font-size: 8px;
                  line-height: 1.1;
                }
                
                .invoice-table.compact .split-row .item-details {
                  font-size: 7px;
                  line-height: 1.1;
                }
              `}
            </style>
            <div className="avoid-page-break">
              <table className={`invoice-table ${items.length > 6 ? 'compact' : ''}`}>
                <thead>
                <tr>
                  <th style={{width: '50%'}}>תיאור הפריט</th>
                  <th>מחיר יחידה</th>
                  <th>כמות</th>
                  <th>הנחה</th>
                  <th>סה"כ</th>
                  <th>פעולות</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => {
                  console.log('Rendering item:', index, item); // לוג לבדיקה
                  return (
                    <React.Fragment key={index}>
                      {/* פריט ראשי */}
                      <tr>
                        <td className="item-description">
                          {editingItem === index ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full p-2 border rounded text-black"
                                placeholder="שם הפריט"
                              />
                              <textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full p-2 border rounded text-black"
                                placeholder="תיאור הפריט"
                                rows={2}
                              />
                            </div>
                          ) : (
                            <>
                              <div className="item-title">{item.name}</div>
                              <div className="item-details">{item.description}</div>
                            </>
                          )}
                        </td>
                        <td>
                          {editingItem === index ? (
                            <input
                              type="number"
                              value={editForm.unit_price}
                              onChange={(e) => setEditForm(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
                              className="w-20 p-1 border rounded text-black text-center"
                            />
                          ) : (
                            formatCurrency(item.unit_price)
                          )}
                        </td>
                        <td>
                          {editingItem === index ? (
                            <input
                              type="number"
                              value={editForm.quantity}
                              onChange={(e) => setEditForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                              className="w-16 p-1 border rounded text-black text-center"
                              min="1"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td>
                          {editingItem === index ? (
                            <input
                              type="number"
                              value={editForm.discount}
                              onChange={(e) => setEditForm(prev => ({ ...prev, discount: Number(e.target.value) }))}
                              className="w-20 p-1 border rounded text-black text-center"
                              min="0"
                            />
                          ) : (
                            item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'
                          )}
                        </td>
                        <td>
                          {editingItem === index ? (
                            formatCurrency((editForm.unit_price * editForm.quantity) - editForm.discount)
                          ) : (
                            formatCurrency(item.total)
                          )}
                        </td>
                        <td>
                          {editingItem === index ? (
                            <div className="flex gap-2">
                              <button
                                onClick={saveEdit}
                                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                              >
                                שמור
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                              >
                                ביטול
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                console.log('Edit button clicked for index:', index);
                                startEdit(index);
                              }}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                            >
                              ערוך
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* פיצולים מתחת לפריט הראשי */}
                      {item.splits && item.splits.map((split: any, splitIndex: number) => (
                          <tr key={`split-${index}-${splitIndex}`} className="split-row"
                              style={{backgroundColor: '#f8f9fa'}}>
                            <td className="item-description">
                              <div className="item-title">{split.name}</div>
                              <div className="item-details">{split.description}</div>
                            </td>
                            <td>{formatCurrency(split.unit_price)}</td>
                            <td>{split.quantity}</td>
                            <td>{split.discount > 0 ? `-${formatCurrency(split.discount)}` : '-'}</td>
                            <td>{formatCurrency(split.total)}</td>
                          </tr>
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* שורות סיכום */}
                <tr className="summary-row-orange">
                  <td className="item-description">סה"כ לפני מע"מ</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>{formatCurrency(quote.total_before_discount)}</td>
                </tr>

                {hasDiscount && (
                    <>

                    <tr className="summary-row-green">
                      <td className="item-description">הנחה ){quote.discount_percent}%(</td>
                      <td></td>
                      <td></td>
                      <td>-{formatCurrency(quote.discount_amount)}</td>
                      <td>-{formatCurrency(quote.discount_amount)}</td>
                    </tr>



                    <tr className="summary-row-orange">
                      <td className="item-description">סה"כ לאחר הנחה</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>{formatCurrency(quote.total_after_discount)}</td>
                    </tr>
                    </>
                )}



                <tr className="summary-row-orange">
                  <td className="item-description">18% מע"מ</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>{formatCurrency(quote.vat_amount)}</td>
                </tr>

                <tr className="final-total summary-row-orange">
                  <td className="item-description">סה"כ כולל מע"מ</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>{formatCurrency(quote.final_total)}</td>
                </tr>
                </tbody>
              </table>
            </div>
</div>

            {/* דף שני ל-PDF */}
            <div className="mt-16" style={{pageBreakBefore: 'always'}}>
              <div className="text-center mb-8">
                <img src="/pdf3.png" alt="header-img" style={{
                  maxWidth: '200px',
                  width: '100%',
                  height: 'auto',
                  margin: '0 auto'
                }}/>
                {/* תמונה שנייה */}
                <div className="mt-4">
                  <img src="/pdf2.png" alt="header-img" style={{maxWidth: '620px', height: 'auto'}}/>
                </div>
                {/* תמונה שלישית */}
                <div className="mt-4 text-left">
                  <img src="/pdf4.png" alt="header-img" style={{
                    maxWidth: '620px',
                    height: 'auto',
                    margin: '0 auto'
                  }}/>
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


          {/* תצוגה רגילה - עם העיצוב החדש */}
        <style>{`
          .event-card {
            background-color: #ffffff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            width: 100%;
            max-width: 700px;
            padding: 40px;
            box-sizing: border-box;
            margin: 0 auto;
          }

          .card-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
          }

          @media (max-width: 768px) {
            .card-content {
              grid-template-columns: 1fr;
              gap: 30px;
            }
          }

          .section {
            display: flex;
            flex-direction: column;
          }

          .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1a202c;
            margin: 0 0 24px 0;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
          }

          .field {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .field:last-child {
            margin-bottom: 0;
          }

          .label {
            font-size: 14px;
            color: #718096;
          }

          .value {
            font-size: 15px;
            font-weight: 500;
            color: #2d3748;
          }

          .special-notes {
            margin-top: 16px;
          }

          .special-notes .label {
            margin-bottom: 8px;
            display: block;
          }

          .special-notes .value {
            background-color: #f7fafc;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 14px;
            line-height: 1.5;
          }
          
          .dark .special-notes .value {
            background-color: #374151;
            border: 1px solid #4b5563;
            color: #f9fafb;
          }
        `}</style>

        <div className="event-card mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="card-content">
            <div className="section">
              <h3 className="section-title text-gray-900 dark:text-white">פרטי האירוע</h3>
              <div className="field">
                <span className="label text-gray-700 dark:text-gray-300">שם האירוע:</span>
                <span className="value text-gray-900 dark:text-white">{quote.event_name}</span>
              </div>
              <div className="field">
                <span className="label text-gray-700 dark:text-gray-300">תאריך:</span>
                <span className="value text-gray-900 dark:text-white">{formatDate(quote.event_date)}</span>
              </div>
              {quote.event_hours && (
                  <div className="field">
                    <span className="label text-gray-700 dark:text-gray-300">שעות:</span>
                    <span className="value text-gray-900 dark:text-white">{quote.event_hours}</span>
                  </div>
              )}
              {quote.special_notes && (
                  <div className="special-notes">
                    <span className="label text-gray-700 dark:text-gray-300">הערות מיוחדות:</span>
                    <div className="value text-gray-900 dark:text-white">{quote.special_notes}</div>
                  </div>
              )}
            </div>

            <div className="section">
              <h3 className="section-title text-gray-900 dark:text-white">פרטי לקוח</h3>
              <div className="field">
                <span className="label text-gray-700 dark:text-gray-300">שם:</span>
                <span className="value text-gray-900 dark:text-white">{quote.client_name}</span>
              </div>
              {quote.client_company && (
                  <div className="field">
                    <span className="label text-gray-700 dark:text-gray-300">חברה:</span>
                    <span className="value text-gray-900 dark:text-white">{quote.client_company}</span>
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* סיכום כספי */}
        <div className="space-y-6">
          <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">סיכום כספי</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">סה"כ לפני הנחה:</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(quote.total_before_discount)}</span>
              </div>
              {quote.discount_percent > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">הנחה ({quote.discount_percent}%):</span>
                    <span className="font-bold text-red-600 dark:text-red-400">-{formatCurrency(quote.discount_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-700 dark:text-gray-300">סה"כ אחרי הנחה:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(quote.total_after_discount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">מע"מ (18%):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">+{formatCurrency(quote.vat_amount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg">
                <span className="font-bold text-gray-800 dark:text-white">סה"כ כולל מע"מ:</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-xl">{formatCurrency(quote.final_total)}</span>
              </div>
            </div>
          </div>

          <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">פרטי יצירה</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div><span className="font-medium">נוצר ב:</span> {formatDate(quote.created_at || '')}</div>
              <div><span className="font-medium">מספר פריטים:</span> {items.length}</div>
            </div>
          </div>
        </div>

        {/* טבלת פריטים */}
        <div className="card mt-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white dark:bg-gray-800">
              <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">שם הפריט</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">תיאור</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">מחיר יחידה</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">כמות</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">הנחה</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">סה"כ</th>
              </tr>
              </thead>
              <tbody>
              {items.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 group">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white relative">
                        <div className="flex items-center justify-between">
                          <span>{item.name}</span>
                          <button
                            onClick={() => handleAddSplit(index)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 rounded"
                            title="הוסף פיצול"
                          >
                            ➕
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(item.total)}</td>
                    </tr>
                    {/* הוספת פיצולים מתחת לפריט הנוכחי */}
                    {item.splits && item.splits.map((split: any, splitIndex: number) => (
                      <tr key={`split-${index}-${splitIndex}`} className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 group">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white pl-8">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-600 dark:text-blue-400">{split.name}</span>
                            <button
                              onClick={() => handleDeleteSplit(index, splitIndex)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-600 rounded"
                              title="מחק פיצול"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{split.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(split.unit_price)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{split.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {split.discount > 0 ? `-${formatCurrency(split.discount)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(split.total)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ניהול תזכורות */}
        {showReminderManager && quoteData && (
          <ReminderManager
            quoteId={quoteId}
            eventDate={quoteData.quote.event_date}
            eventName={quoteData.quote.event_name}
            onClose={() => setShowReminderManager(false)}
          />
        )}

        {/* מודל פיצולים */}
        <SplitModal
          isOpen={showSplitModal}
          onClose={() => {
            setShowSplitModal(false);
            setSelectedItemIndex(null);
          }}
          onSelectSplit={handleSelectSplit}
          itemName={quoteData && selectedItemIndex !== null ? items[selectedItemIndex]?.name || '' : ''}
        />
      </div>

  );
};

export default QuoteDetails;
