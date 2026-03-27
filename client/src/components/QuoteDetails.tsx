import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { QuoteWithItems, QuoteImage, QuoteExpense } from '../types';
import { quotesAPI, itemsAPI, quoteImagesAPI, quoteExpensesAPI } from '../services/supabaseAPI';
import ReminderManager from './ReminderManager';
import SplitModal from './SplitModal';
import { useTheme } from '../context/ThemeContext';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface QuoteDetailsProps {
  quoteId: number;
  onBack: () => void;
  onDuplicate?: (quoteData: QuoteWithItems) => void;
}

type QuoteStatus = 'initial' | 'negotiation' | 'reserved' | 'signed';

const STATUS_OPTIONS: Array<{ value: QuoteStatus; label: string }> = [
  { value: 'initial', label: 'ראשוני' },
  { value: 'negotiation', label: 'מתנהל משא ומתן' },
  { value: 'reserved', label: 'משוריין' },
  { value: 'signed', label: 'חתום' },
];

const QuoteDetails: React.FC<QuoteDetailsProps> = ({ quoteId, onBack, onDuplicate }) => {
  const { theme, toggleTheme } = useTheme();
  const [quoteData, setQuoteData] = useState<QuoteWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportReady, setExportReady] = useState(true);
  const exportReadyRef = useRef(true);
  const lastSyncedExtraFromDbRef = useRef<number | null>(null);
  useEffect(() => { exportReadyRef.current = exportReady; }, [exportReady]);
  const [extraVatDiscountPercent, setExtraVatDiscountPercent] = useState<number>(0);
  const [showReminderManager, setShowReminderManager] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemPosition, setAddItemPosition] = useState<{ type: 'before' | 'after', itemId: number } | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogItems, setCatalogItems] = useState<Array<{ id: number; name: string; description: string; price: number }>>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [quoteImages, setQuoteImages] = useState<QuoteImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [removingImageId, setRemovingImageId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<QuoteImage | null>(null);
  const [quoteExpenses, setQuoteExpenses] = useState<QuoteExpense[]>([]);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [removingExpenseId, setRemovingExpenseId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    unit_price: 0,
    quantity: 1,
    discount: 0
  });
  const pdfRef = useRef<HTMLDivElement>(null);

  // Calculate totals from current items - must be before any early returns
  const totals = useMemo(() => {
    if (!quoteData) {
      return { subtotal: 0, discountAmount: 0, totalAfterDiscount: 0, vatAmount: 0, finalTotal: 0 };
    }
    const items = quoteData.items || [];
    const subtotal = items.reduce((sum, it) => sum + Number(it.total || 0), 0);
    const discountPercent = Number(quoteData.quote.discount_percent || 0);
    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    const totalAfterDiscount = subtotal - discountAmount;
    const vatAmount = Math.round(totalAfterDiscount * 0.18);
    const finalTotal = totalAfterDiscount + vatAmount;
    return { subtotal, discountAmount, totalAfterDiscount, vatAmount, finalTotal };
  }, [quoteData]);

  const extraDiscountAmount = useMemo(() => {
    const base = totals.totalAfterDiscount || 0;
    return Math.round(base * (extraVatDiscountPercent / 100));
  }, [totals.totalAfterDiscount, extraVatDiscountPercent]);

  const totalAfterExtraDiscount = useMemo(() => {
    const base = totals.totalAfterDiscount || 0;
    return Math.max(base - extraDiscountAmount, 0);
  }, [totals.totalAfterDiscount, extraDiscountAmount]);

  const vatAfterExtraDiscount = useMemo(() => {
    return Math.round(totalAfterExtraDiscount * 0.18);
  }, [totalAfterExtraDiscount]);

  const finalAfterExtraDiscount = useMemo(() => {
    return totalAfterExtraDiscount + vatAfterExtraDiscount;
  }, [totalAfterExtraDiscount, vatAfterExtraDiscount]);

  const totalExpenses = useMemo(() => {
    return quoteExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  }, [quoteExpenses]);

  const netIncomeAfterExpenses = useMemo(() => {
    return finalAfterExtraDiscount - totalExpenses;
  }, [finalAfterExtraDiscount, totalExpenses]);

  // Sync extra VAT discount from DB only when quote loads/changes; don't overwrite recent UI changes
  useEffect(() => {
    if (!quoteData?.quote) return;
    const dbVal = (quoteData.quote as any).extra_vat_discount_percent;
    if (dbVal === null || dbVal === undefined) return;
    const percent = Number(dbVal);
    if (!Number.isNaN(percent) && lastSyncedExtraFromDbRef.current !== percent) {
      lastSyncedExtraFromDbRef.current = percent;
      setExtraVatDiscountPercent(percent);
    }
  }, [quoteData?.quote?.extra_vat_discount_percent, quoteData?.quote]);

  // Cooldown readiness after discount/total changes to avoid exporting stale DOM
  useEffect(() => {
    // when discount percent or final total changes, start a short cooldown
    setExportReady(false);
    const id = setTimeout(() => setExportReady(true), 450);
    return () => clearTimeout(id);
  }, [extraVatDiscountPercent, totals.finalTotal]);

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
      
      // עדכון במסד הנתונים - רק אם יש ID
      if (item.id) {
        console.log('Updating item in database:', item.id, {
          item_name: editForm.name,
          item_description: editForm.description,
          unit_price: editForm.unit_price,
          quantity: editForm.quantity,
          discount: editForm.discount,
          total: item.total
        });
        
        try {
          await quotesAPI.updateItem(item.id, {
            item_name: editForm.name,
            item_description: editForm.description,
            unit_price: editForm.unit_price,
            quantity: editForm.quantity,
            discount: editForm.discount,
            total: item.total
          });
          
          console.log('Item updated successfully in database');
          
          // טעינה מחדש של הנתונים מהמסד כדי לוודא שהעדכון נשמר
          await loadQuoteDetails();
        } catch (updateError) {
          console.error('Database update failed:', updateError);
          throw updateError; // נזרוק את השגיאה כדי שהטיפול הכללי יתמודד איתה
        }
      } else {
        console.warn('Cannot update item - no ID found:', item);
        alert('שגיאה: לא ניתן לעדכן פריט ללא מזהה');
        return;
      }
      
      setEditingItem(null);
      alert('הפריט עודכן בהצלחה!');
    } catch (error) {
      console.error('שגיאה בעדכון פריט:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`שגיאה בעדכון הפריט: ${errorMessage}`);
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
          id: it.id,
          name: it.name, 
          description: it.description 
        }); // לוג לבדיקה
        return {
          id: it.id, // חשוב לשמור את ה-ID!
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

  const loadQuoteImages = useCallback(async () => {
    try {
      const images = await quoteImagesAPI.listByQuote(quoteId);
      setQuoteImages(images);
    } catch (error) {
      console.error('שגיאה בטעינת תמונות להצעה:', error);
    }
  }, [quoteId]);

  useEffect(() => {
    loadQuoteImages();
  }, [loadQuoteImages]);

  const loadQuoteExpenses = useCallback(async () => {
    try {
      const expenses = await quoteExpensesAPI.listByQuote(quoteId);
      setQuoteExpenses(expenses);
    } catch (error) {
      console.error('שגיאה בטעינת הוצאות להצעה:', error);
    }
  }, [quoteId]);

  useEffect(() => {
    loadQuoteExpenses();
  }, [loadQuoteExpenses]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'לא צוין';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  const formatCurrency = (amount: number) => `₪${amount.toLocaleString('he-IL')}`;

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
      const updatedItems = [...quoteData.items];
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

    const splitToDelete = quoteData.items[itemIndex].splits![splitIndex];
    
    try {
      // מחיקת הפיצול מהמסד הנתונים
      await quotesAPI.deleteSplit(quoteId, splitToDelete.name);
      
      // עדכון ה-UI
      const updatedItems = [...quoteData.items];
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

      // If not ready yet, wait until exportReady is true
      let guardCount = 0;
      while (!exportReadyRef.current && guardCount < 10) {
        await new Promise<void>((r) => setTimeout(r, 60));
        guardCount++;
      }

      // Ensure any pending React updates are flushed
      flushSync(() => {});

      // הצג את הקונטיינר ל-PDF
      element.style.display = 'block';

      // המתנה למיקרוטסק, טיימאאוט קצר ושתי מסגרות רינדור כדי להבטיח שה-DOM מעודכן
      await Promise.resolve();
      await new Promise<void>((r) => setTimeout(r, 0));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      // כפיית reflow
      void element.offsetHeight;

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
           mode: ['css', 'legacy'],
           avoid: ['.avoid-page-break', '.item-group']
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

  const handleExportWord = async () => {
    if (!quoteData || !pdfRef.current) return;

    try {
      setExportingWord(true);

      const element = pdfRef.current;

      // המרת תמונות ל-Base64
      const convertImagesToBase64 = async (html: string): Promise<string> => {
        const imgRegex = /<img[^>]+src="([^"]+)"/g;
        const images = html.match(imgRegex);
        
        if (!images) return html;

        let convertedHtml = html;
        
        for (const imgTag of images) {
          const srcMatch = imgTag.match(/src="([^"]+)"/);
          if (!srcMatch) continue;
          
          const src = srcMatch[1];
          
          // דלג על תמונות שכבר Base64
          if (src.startsWith('data:')) continue;

          try {
            // טעינת התמונה
            const response = await fetch(src);
            const blob = await response.blob();
            
            // המרה ל-Base64
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            // החלפת ה-src
            convertedHtml = convertedHtml.replace(
              new RegExp(`src="${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
              `src="${base64}"`
            );
          } catch (error) {
            console.error('Error converting image:', error);
          }
        }

        return convertedHtml;
      };

      const elementHTML = element.innerHTML;
      const htmlWithImages = await convertImagesToBase64(elementHTML);

      // יצירת HTML מותאם ל-Word
      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:w="urn:schemas-microsoft-com:office:word"
        xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>${quoteData.quote.event_name}</title>
          <style>
            body { direction: rtl; font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            th { background-color: #ccc; }
          </style>
        </head>
        <body>
          ${htmlWithImages}
        </body>
        </html>
      `;

      // המרה ל-blob והורדה
      const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quoteData.quote.event_name}_${quoteData.quote.client_company}_${formatDate(quoteData.quote.event_date)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Word יוצא בהצלחה!');
    } catch (error) {
      console.error('שגיאה בייצוא Word:', error);
      alert('שגיאה בייצוא Word');
    } finally {
      setExportingWord(false);
    }
  };

  const openAddItemModal = async (position?: { type: 'before' | 'after', itemId: number }) => {
    try {
      setAddItemPosition(position || null);
      setShowAddItemModal(true);
      setCatalogLoading(true);
      const items = await itemsAPI.getAll();
      setCatalogItems(items as any);
    } catch (e) {
      console.error('Failed to load catalog items', e);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleCatalogSearch = async (q: string) => {
    setCatalogSearch(q);
    try {
      setCatalogLoading(true);
      const items = q.trim() ? await itemsAPI.search(q.trim()) : await itemsAPI.getAll();
      setCatalogItems(items as any);
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setCatalogLoading(false);
    }
  };

  const addCatalogItemToQuote = async (item: { id: number; name: string; description: string; price: number }) => {
    if (!quoteData?.quote?.id) return;
    try {
      const payload: any = {
        quote_id: quoteData.quote.id,
        item_name: item.name,
        item_description: item.description || '',
        unit_price: Number(item.price) || 0,
        quantity: 1,
        discount: 0,
        total: Number(item.price) || 0,
      };

      // הוספת מיקום אם נבחר
      if (addItemPosition) {
        if (addItemPosition.type === 'before') {
          payload.beforeItemId = addItemPosition.itemId;
        } else {
          payload.afterItemId = addItemPosition.itemId;
        }
      }

      await quotesAPI.addItem(payload);
      await loadQuoteDetails();
      setShowAddItemModal(false);
      setAddItemPosition(null);
    } catch (e) {
      console.error('Failed adding item to quote', e);
      alert('שגיאה בהוספת פריט להצעה');
    }
  };

  const handleImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;

    try {
      setUploadingImages(true);
      await Promise.all(files.map((file) => quoteImagesAPI.upload(quoteId, file)));
      await loadQuoteImages();
    } catch (error) {
      console.error('שגיאה בהעלאת תמונות:', error);
      alert('העלאת התמונות נכשלה');
    } finally {
      setUploadingImages(false);
      event.target.value = '';
    }
  };

  const handleDeleteImage = async (image: QuoteImage) => {
    const ok = window.confirm(`למחוק את התמונה "${image.file_name}"?`);
    if (!ok) return;

    try {
      setRemovingImageId(image.id);
      await quoteImagesAPI.remove(image.id);
      setQuoteImages((prev) => prev.filter((img) => img.id !== image.id));
    } catch (error) {
      console.error('שגיאה במחיקת תמונה:', error);
      alert('מחיקת התמונה נכשלה');
    } finally {
      setRemovingImageId(null);
    }
  };

  const handleAddExpense = async () => {
    const description = expenseDescription.trim();
    const amount = Number(expenseAmount);
    if (!description) {
      alert('יש להזין תיאור הוצאה');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      alert('יש להזין סכום הוצאה תקין');
      return;
    }

    try {
      setSavingExpense(true);
      const created = await quoteExpensesAPI.create({
        quote_id: quoteId,
        description,
        amount,
      });
      setQuoteExpenses((prev) => [...prev, created]);
      setExpenseDescription('');
      setExpenseAmount('');
    } catch (error) {
      console.error('שגיאה בהוספת הוצאה:', error);
      alert('הוספת ההוצאה נכשלה');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expense: QuoteExpense) => {
    const ok = window.confirm(`למחוק את ההוצאה "${expense.description}"?`);
    if (!ok) return;

    try {
      setRemovingExpenseId(expense.id);
      await quoteExpensesAPI.remove(expense.id);
      setQuoteExpenses((prev) => prev.filter((x) => x.id !== expense.id));
    } catch (error) {
      console.error('שגיאה במחיקת הוצאה:', error);
      alert('מחיקת ההוצאה נכשלה');
    } finally {
      setRemovingExpenseId(null);
    }
  };

  const handleStatusChange = async (nextStatus: QuoteStatus) => {
    const prevStatus = (quoteData?.quote?.quote_status as QuoteStatus | undefined) || 'initial';
    if (!quoteData?.quote?.id || prevStatus === nextStatus) return;

    setQuoteData((prev) => prev ? {
      ...prev,
      quote: {
        ...prev.quote,
        quote_status: nextStatus,
      }
    } : prev);

    try {
      await quotesAPI.update(quoteData.quote.id, { quote_status: nextStatus });
    } catch (error) {
      console.error('שגיאה בעדכון סטטוס הצעה:', error);
      setQuoteData((prev) => prev ? {
        ...prev,
        quote: {
          ...prev.quote,
          quote_status: prevStatus,
        }
      } : prev);
      alert('שמירת הסטטוס נכשלה');
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
            <div className="mt-3 flex items-center justify-center gap-2">
              <label htmlFor="quote-status" className="text-sm font-medium text-gray-700 dark:text-gray-200">סטטוס הצעה:</label>
              <select
                id="quote-status"
                value={(quote.quote_status as QuoteStatus) || 'initial'}
                onChange={(e) => handleStatusChange(e.target.value as QuoteStatus)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleExportPDF} disabled={exportingPDF || !exportReady} className="btn-success">
                {exportingPDF ? 'מייצא...' : '📄 ייצא PDF'}
              </button>
              <button onClick={handleExportWord} disabled={exportingWord} className="btn-success">
                {exportingWord ? 'מייצא...' : '📝 ייצא Word'}
              </button>
              <button 
                onClick={() => setShowReminderManager(true)} 
                className="btn-primary"
              >
                🔔 ניהול תזכורות
              </button>
              {onDuplicate && (
                <button 
                  onClick={() => onDuplicate(quoteData)} 
                  className="btn-primary bg-purple-500 hover:bg-purple-600"
                >
                  📋 שכפל הצעה
                </button>
              )}
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
          <div className="text-center mb-3">
            <img src="/pdf1.png" alt="header-img" style={{
              maxWidth: '600px',
              width: '100%',
              height: 'auto',
              margin: '0 auto'
            }}/>
          </div>

          {/* --- כותרת שם האירוע מחוץ ל-border --- */}
          <div className="text-center mb-3">
            <h2 className="text-lg font-bold">{quote.event_name}</h2>
          </div>

          {/* עיצוב מותאם ל-PDF */}
          <style>{`
        .pdf-event-card {
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          padding: 16px;
          margin-bottom: 12px;
        }
        .pdf-card-content { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .pdf-section { display: flex; flex-direction: column; }
        .pdf-section-title {
          font-size: 14px; font-weight: 700; color: #1a202c;
          margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;
        }
        .pdf-field { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
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

          {/* טבלת פריטים - תמיד תהיה בעמוד 1 */}
          <div className="mb-8" style={{marginTop: '-10px'}}>

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

                /* צבעים קיימים */
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
                
                /* מניעת שבירת עמוד בתוך פריט (פריט + פיצולים שלו) */
                .avoid-page-break {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                
                /* קבוצת פריט - כל הפריט והפיצולים שלו נשארים יחד */
                .item-group {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  display: table-row-group;
                }
                
                /* כל שורה בתוך קבוצת פריט */
                .item-group tr {
                  page-break-inside: avoid;
                }
                
                /* שמירה על שורות פיצולים יחד עם הפריט הראשי */
                .invoice-table tbody tr.split-row {
                  page-break-before: avoid;
                  break-before: avoid;
                }
                
                /* שמירה על שורות סיכום יחד */
                .summary-group {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  display: table-row-group;
                }
                
                .invoice-table tbody tr.summary-row-orange,
                .invoice-table tbody tr.summary-row-green {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                
                /* הטבלה עצמה יכולה להישבר בין שורות */
                .invoice-table {
                  page-break-inside: auto;
                }
                
                /* אפשר שבירה בין פריטים */
                .invoice-table tbody tr:not(.split-row):not(.summary-row-orange):not(.summary-row-green) {
                  page-break-after: auto;
                  page-break-before: auto;
                }
              `}
            </style>
            <table className={`invoice-table ${items.length > 6 ? 'compact' : ''}`}>
                <thead>
                <tr>
                  <th style={{width: '50%'}}>תיאור הפריט</th>
                  <th>מחיר יחידה</th>
                  <th>כמות</th>
                  <th>הנחה</th>
                  <th>סה"כ</th>
                </tr>
                </thead>
                {items.map((item, index) => {
                  console.log('Rendering item:', index, item); // לוג לבדיקה
                  return (
                    <tbody key={index} className="item-group">
                      {/* פריט ראשי */}
                      <tr className="avoid-page-break">
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
                              title="מחיר יחידה"
                              aria-label="מחיר יחידה"
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
                              title="כמות"
                              aria-label="כמות"
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
                              title="הנחה"
                              aria-label="הנחה"
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
                      </tr>
                      {/* פיצולים מתחת לפריט הראשי */}
                      {item.splits && item.splits.map((split: any, splitIndex: number) => (
                          <tr key={`split-${index}-${splitIndex}`} className="split-row avoid-page-break"
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
                    </tbody>
                  );
                })}

                {/* שורות סיכום */}
                <tbody className="summary-group">
                <tr className="summary-row-orange avoid-page-break">
                  <td className="item-description">סה"כ לפני מע"מ</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>{formatCurrency(totals.subtotal)}</td>
                </tr>

                {hasDiscount && (
                    <>

                    <tr className="summary-row-green avoid-page-break">
                      <td className="item-description">הנחה ){quote.discount_percent}%(</td>
                      <td></td>
                      <td></td>
                      <td>-{formatCurrency(totals.discountAmount)}</td>
                      <td>-{formatCurrency(totals.discountAmount)}</td>
                    </tr>



                    <tr className="summary-row-orange avoid-page-break">
                      <td className="item-description">סה"כ לאחר הנחה</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>{formatCurrency(totals.totalAfterDiscount)}</td>
                    </tr>
                    </>
                )}
                {extraVatDiscountPercent > 0 && (
                  <tr className="summary-row-green avoid-page-break">
                    <td className="item-description">הנחה למחיר סופי ){extraVatDiscountPercent}%(</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>-{formatCurrency(extraDiscountAmount)}</td>
                  </tr>
                )}

                <tr className="summary-row-orange avoid-page-break">
                  <td className="item-description">18% מע"מ</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>{formatCurrency(vatAfterExtraDiscount)}</td>
                </tr>

                <tr className="final-total summary-row-orange avoid-page-break">
                  <td className="item-description">סה"כ כולל מע"מ</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>{formatCurrency(finalAfterExtraDiscount)}</td>
                </tr>
                </tbody>
              </table>
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
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totals.subtotal)}</span>
              </div>
              {quote.discount_percent > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">הנחה ({quote.discount_percent}%):</span>
                    <span className="font-bold text-red-600 dark:text-red-400">-{formatCurrency(totals.discountAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800 dark:text-white">הנחה למחיר סופי:</span>
                  <select
                    value={extraVatDiscountPercent}
                    onChange={async (e) => {
                      const val = parseInt(e.target.value);
                      const previous = extraVatDiscountPercent;
                      const ok = window.confirm(`להחיל הנחה סופית של ${val}%?`);
                      if (!ok) {
                        e.target.value = String(previous);
                        return;
                      }
                      try {
                        const newAmount = Math.round((totals.totalAfterDiscount || 0) * (val / 100));
                      setExtraVatDiscountPercent(val);
                        if (quoteData?.quote?.id) {
                          await quotesAPI.update(quoteData.quote.id, {
                            extra_vat_discount_percent: val,
                            extra_vat_discount_amount: newAmount,
                          });
                          setQuoteData((prev) => prev ? {
                            ...prev,
                            quote: {
                              ...prev.quote,
                              extra_vat_discount_percent: val,
                              extra_vat_discount_amount: newAmount,
                            }
                          } : prev);
                          lastSyncedExtraFromDbRef.current = val;
                        }
                      } catch (err) {
                        console.error('Failed saving extra VAT discount:', err);
                        alert('שמירת ההנחה נכשלה. הערך יוחזר לקודם.');
                        setExtraVatDiscountPercent(previous);
                        e.target.value = String(previous);
                      }
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    title='בחר אחוז הנחה על הסכום לפני מע"מ'
                    aria-label='בחר אחוז הנחה על הסכום לפני מע"מ'
                  >
                    <option value={0}>ללא</option>
                    <option value={5}>5%</option>
                    <option value={10}>10%</option>
                  </select>
                </div>
                <span className="font-bold text-red-600 dark:text-red-400">-{formatCurrency(extraDiscountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">מע"מ (18%):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">+{formatCurrency(vatAfterExtraDiscount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg">
                <span className="font-bold text-gray-800 dark:text-white">סה"כ לתשלום:</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-xl">{formatCurrency(finalAfterExtraDiscount)}</span>
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

        <div className="card mt-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">תמונות להצעה</h3>
            <label className={`px-3 py-1 rounded text-sm text-white cursor-pointer ${uploadingImages ? 'bg-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {uploadingImages ? 'מעלה...' : 'העלה תמונות'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesUpload}
                className="hidden"
                disabled={uploadingImages}
              />
            </label>
          </div>

          {quoteImages.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">אין תמונות להצעה זו עדיין.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quoteImages.map((image) => (
                <div key={image.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                  {image.public_url ? (
                    <button
                      type="button"
                      onClick={() => setSelectedImage(image)}
                      className="block w-full text-right"
                      title="פתח תצוגה גדולה"
                    >
                      <img
                        src={image.public_url}
                        alt={image.file_name}
                        className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                      תצוגה מקדימה לא זמינה
                    </div>
                  )}
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-700 dark:text-gray-300 truncate" title={image.file_name}>
                      {image.file_name}
                    </div>
                    <div className="flex items-center gap-1">
                      {image.public_url && (
                        <a
                          href={image.public_url}
                          download={image.file_name}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          title="הורד תמונה"
                        >
                          הורד
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteImage(image)}
                        disabled={removingImageId === image.id}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-60"
                      >
                        {removingImageId === image.id ? 'מוחק...' : 'מחק'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedImage?.public_url && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-5xl w-full bg-gray-900 rounded-lg p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-white truncate">{selectedImage.file_name}</div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedImage.public_url}
                    download={selectedImage.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    הורד
                  </a>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600"
                  >
                    סגור
                  </button>
                </div>
              </div>
              <img
                src={selectedImage.public_url}
                alt={selectedImage.file_name}
                className="w-full max-h-[75vh] object-contain rounded"
              />
            </div>
          </div>
        )}

        <div className="card mt-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">הוצאות להצעה</h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
            <input
              type="text"
              value={expenseDescription}
              onChange={(e) => setExpenseDescription(e.target.value)}
              placeholder="תיאור הוצאה"
              className="md:col-span-7 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="סכום"
              className="md:col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleAddExpense}
              disabled={savingExpense}
              className="md:col-span-2 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingExpense ? 'שומר...' : 'הוסף'}
            </button>
          </div>

          {quoteExpenses.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">אין הוצאות להצעה זו.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {quoteExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded p-2">
                  <div className="text-sm text-gray-800 dark:text-gray-100">
                    <div className="font-medium">{expense.description}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(expense.created_at).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">-{formatCurrency(Number(expense.amount || 0))}</span>
                    <button
                      onClick={() => handleDeleteExpense(expense)}
                      disabled={removingExpenseId === expense.id}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-60"
                    >
                      {removingExpenseId === expense.id ? 'מוחק...' : 'מחק'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">סה"כ הוצאות:</span>
              <span className="font-bold text-red-600 dark:text-red-400">-{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-bold text-gray-800 dark:text-white">הכנסה אחרי הוצאות:</span>
              <span className={`font-bold ${netIncomeAfterExpenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(netIncomeAfterExpenses)}
              </span>
            </div>
          </div>
        </div>

        {/* טבלת פריטים */}
        <div className="card mt-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="text-sm font-semibold text-gray-800 dark:text-white">שם הפריט	תיאור</div>
            <button onClick={() => openAddItemModal()} className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">הוסף פריט</button>
          </div>
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
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">פעולות</th>
              </tr>
              </thead>
              <tbody>
              {items.map((item, index) => (
                  <React.Fragment key={index}>
                    <tr className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 group">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white relative">
                        {editingItem === index ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-2 border rounded text-black dark:text-white dark:bg-gray-700 dark:border-gray-600"
                            placeholder="שם הפריט"
                          />
                        ) : (
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
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {editingItem === index ? (
                          <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-2 border rounded text-black dark:text-white dark:bg-gray-700 dark:border-gray-600"
                            placeholder="תיאור הפריט"
                            rows={2}
                          />
                        ) : (
                          item.description
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {editingItem === index ? (
                          <input
                            type="number"
                            value={editForm.unit_price}
                            onChange={(e) => setEditForm(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
                            className="w-20 p-1 border rounded text-black dark:text-white dark:bg-gray-700 dark:border-gray-600 text-center"
                            title="מחיר יחידה"
                            aria-label="מחיר יחידה"
                          />
                        ) : (
                          formatCurrency(item.unit_price)
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {editingItem === index ? (
                          <input
                            type="number"
                            value={editForm.quantity}
                            onChange={(e) => setEditForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                            className="w-16 p-1 border rounded text-black dark:text-white dark:bg-gray-700 dark:border-gray-600 text-center"
                            min="1"
                            title="כמות"
                            aria-label="כמות"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {editingItem === index ? (
                          <div className="space-y-2">
                            <input
                              type="number"
                              value={editForm.discount}
                              onChange={(e) => setEditForm(prev => ({ ...prev, discount: Number(e.target.value) }))}
                              className="w-20 p-1 border rounded text-black dark:text-white dark:bg-gray-700 dark:border-gray-600 text-center"
                              min="0"
                              placeholder="0"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const discount5 = Math.round(editForm.unit_price * editForm.quantity * 0.05);
                                  setEditForm(prev => ({ ...prev, discount: discount5 }));
                                }}
                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                                title="5% הנחה"
                              >
                                5%
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const discount10 = Math.round(editForm.unit_price * editForm.quantity * 0.10);
                                  setEditForm(prev => ({ ...prev, discount: discount10 }));
                                }}
                                className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                                title="10% הנחה"
                              >
                                10%
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditForm(prev => ({ ...prev, discount: 0 }))}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                title="אין הנחה"
                              >
                                אין
                              </button>
                            </div>
                          </div>
                        ) : (
                          item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        {editingItem === index ? (
                          formatCurrency((editForm.unit_price * editForm.quantity) - editForm.discount)
                        ) : (
                          formatCurrency(item.total)
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
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
                            <button
                              onClick={async () => {
                                if (!item.id) return;
                                if (!window.confirm('למחוק את הפריט מההצעה?')) return;
                                try {
                                  await quotesAPI.deleteItem(item.id);
                                  await loadQuoteDetails();
                                  setEditingItem(null);
                                } catch (e) {
                                  console.error('Delete item failed', e);
                                  alert('שגיאה במחיקת פריט');
                                }
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                              מחק
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 flex-col">
                            <div className="flex gap-1">
                              <button
                                onClick={() => item.id && openAddItemModal({ type: 'before', itemId: item.id })}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="הוסף פריט לפני"
                                disabled={!item.id}
                              >
                                ⬆️ לפני
                              </button>
                              <button
                                onClick={() => item.id && openAddItemModal({ type: 'after', itemId: item.id })}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="הוסף פריט אחרי"
                                disabled={!item.id}
                              >
                                ⬇️ אחרי
                              </button>
                            </div>
                            <button
                              onClick={() => startEdit(index)}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                            >
                              ערוך
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {/* הוספת פיצולים מתחת לפריט הנוכחי */}
                    {item.splits && item.splits.map((split: any, splitIndex: number) => (
                      <tr key={`split-${index}-${splitIndex}`} className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 group">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white pl-8">
                          <span className="text-blue-600 dark:text-blue-400">{split.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{split.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(split.unit_price)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{split.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {split.discount > 0 ? `-${formatCurrency(split.discount)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(split.total)}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleDeleteSplit(index, splitIndex)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            מחק
                          </button>
                        </td>
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
          itemName={quoteData && selectedItemIndex !== null ? items[selectedItemIndex as number]?.name || '' : ''}
        />

        {showAddItemModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">הוסף פריט מהקטלוג</h3>
                <button onClick={() => setShowAddItemModal(false)} className="text-gray-600 dark:text-gray-300 hover:text-gray-900">✕</button>
              </div>
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => handleCatalogSearch(e.target.value)}
                className="w-full input-field mb-3"
                placeholder="חפש פריט..."
              />
              <div className="max-h-80 overflow-y-auto border rounded">
                {catalogLoading ? (
                  <div className="p-4 text-center text-gray-600 dark:text-gray-300">טוען...</div>
                ) : catalogItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-600 dark:text-gray-300">לא נמצאו פריטים</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700 text-right">
                        <th className="px-3 py-2">שם</th>
                        <th className="px-3 py-2">תיאור</th>
                        <th className="px-3 py-2">מחיר</th>
                        <th className="px-3 py-2">פעולה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogItems.map((it) => (
                        <tr key={it.id} className="border-t dark:border-gray-700">
                          <td className="px-3 py-2">{it.name}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{it.description}</td>
                          <td className="px-3 py-2">{formatCurrency(Number(it.price) || 0)}</td>
                          <td className="px-3 py-2 text-left">
                            <button onClick={() => addCatalogItemToQuote(it)} className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">הוסף</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="mt-3 text-left">
                <button onClick={() => setShowAddItemModal(false)} className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600">סגור</button>
              </div>
            </div>
          </div>
        )}
      </div>

  );
};

export default QuoteDetails;
