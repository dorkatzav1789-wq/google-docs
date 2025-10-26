import React, { useState } from 'react';
import { Client, Quote, QuoteItem } from '../types';
import ClientSelector from './ClientSelector';
import NewClientForm from './NewClientForm';
import QuoteItemsInput from './QuoteItemsInput';
import QuoteSummary from './QuoteSummary';
import ItemsManager from './ItemsManager';
import { quotesAPI } from '../services/supabaseAPI';
import { useTheme } from '../context/ThemeContext';

interface QuoteFormProps {
  onQuoteSaved?: () => void;
  onBack: () => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ onQuoteSaved, onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [eventDetails, setEventDetails] = useState({
    event_name: '',
    event_date: '',
    event_hours: '',
    special_notes: '',
  });
  const [loading, setLoading] = useState(false);

  // === תנאי הפעלה של הכפתור ===
  const canSave =
      !loading &&
      !!selectedClient &&
      items.length > 0 &&
      eventDetails.event_name.trim().length > 0;

  // (אופציונלי) הסבר למה הכפתור כבוי – יוצג ב-tooltip
  const disabledReason =
      loading
          ? 'שומר כרגע...'
          : !selectedClient
              ? 'לא נבחר לקוח'
              : items.length === 0
                  ? 'אין פריטים בהצעה'
                  : !eventDetails.event_name.trim()
                      ? 'חסר שם אירוע'
                      : '';

  // === Handlers ===
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setShowNewClientForm(false);
  };

  const handleNewClient = () => {
    setShowNewClientForm(true);
  };

  const handleClientCreated = (client: Client) => {
    setSelectedClient(client);
    setShowNewClientForm(false);
  };

  const handleCancelNewClient = () => {
    setShowNewClientForm(false);
  };

  const handleItemsChange = (newItems: QuoteItem[]) => {
    console.log('handleItemsChange called with:', newItems);
    console.log('Items details in handleItemsChange:', newItems.map(item => ({
      name: item.name,
      description: item.description,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total: item.total
    })));
    setItems(newItems);
  };

  const handleDiscountChange = (discount: number) => {
    setDiscountPercent(discount);
  };

  const handleEventDetailsChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEventDetails(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (subtotal * discountPercent) / 100;
    const totalAfterDiscount = subtotal - discountAmount;
    const vatAmount = totalAfterDiscount * 0.18;
    const finalTotal = totalAfterDiscount + vatAmount;

    return {
      total_before_discount: subtotal,
      discount_amount: discountAmount,
      total_after_discount: totalAfterDiscount,
      vat_amount: vatAmount,
      final_total: finalTotal,
    };
  };

  const handleSaveQuote = async () => {
    console.log('handleSaveQuote called');

    // ולידציות בסיסיות (חלקן כבר מכוסות ב-canSave)
    if (!selectedClient) {
      alert('יש לבחור לקוח');
      return;
    }
    if (items.length === 0) {
      alert('יש להוסיף לפחות פריט אחד');
      return;
    }
    if (!eventDetails.event_name.trim()) {
      alert('שם האירוע הוא שדה חובה');
      return;
    }

    try {
      console.log('Starting to save quote...');
      setLoading(true);
      const totals = calculateTotals();
      console.log('Totals calculated:', totals);

      const quote: Quote = {
        client_id: selectedClient.id,
        event_name: eventDetails.event_name,
        event_date: eventDetails.event_date,
        event_hours: eventDetails.event_hours,
        special_notes: eventDetails.special_notes,
        discount_percent: discountPercent,
        ...totals,
      };

      console.log('Quote data:', quote);
      console.log('Items:', items);
    console.log('Items details:', items.map(item => ({
      name: item.name,
      description: item.description,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total: item.total
    })));

      const result = await quotesAPI.create(quote, items);
      console.log('Quote saved successfully:', result);
      alert(`הצעת המחיר נשמרה בהצלחה! מספר הצעה: ${result.id}`);

      // עדכון הרשימה במסך ההורה וחזרה לרשימה
      if (onQuoteSaved) {
        onQuoteSaved();
      }
      onBack();

      // איפוס טופס (אופציונלי)
      setItems([]);
      setDiscountPercent(0);
      setEventDetails({
        event_name: '',
        event_date: '',
        event_hours: '',
        special_notes: '',
      });
      // אפשר להשאיר את selectedClient או לאפס לפי הצורך:
      // setSelectedClient(null);
    } catch (error) {
      console.error('שגיאה בשמירת הצעת מחיר:', error);
      alert('שגיאה בשמירת הצעת המחיר');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="w-full mx-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="text-center mb-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center justify-center space-x-2 text-sm mb-4" aria-label="Breadcrumb">
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
            <span className="text-gray-600 dark:text-gray-300">הצעה חדשה</span>
          </nav>
          
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700"
            >
              חזרה להצעות מחיר
            </button>
            <h1 className="text-3xl font-bold text-black dark:text-white">מערכת ניהול הצעות מחיר</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={theme === 'light' ? 'מעבר למצב כהה' : 'מעבר למצב בהיר'}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
          <p className="text-black/80 dark:text-white/80 mt-2">צור הצעת מחיר חדשה</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* צד שמאל - בחירת לקוח וניהול פריטים */}
          <div className="lg:col-span-1 space-y-6">
            {showNewClientForm ? (
                <NewClientForm
                    onClientCreated={handleClientCreated}
                    onCancel={handleCancelNewClient}
                />
            ) : (
                <ClientSelector
                    selectedClient={selectedClient}
                    onClientSelect={handleClientSelect}
                    onNewClient={handleNewClient}
                />
            )}
            
            {/* ניהול פריטים */}
            <ItemsManager />
          </div>

          {/* צד ימין - פרטי הצעה */}
          <div className="lg:col-span-3 space-y-6">
            {/* פרטי אירוע */}
            <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">פרטי האירוע</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שם האירוע *
                  </label>
                  <input
                      type="text"
                      name="event_name"
                      value={eventDetails.event_name}
                      onChange={handleEventDetailsChange}
                      required
                      className="input-field"
                      placeholder="שם האירוע"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    תאריך האירוע
                  </label>
                  <input
                      type="date"
                      name="event_date"
                      value={eventDetails.event_date}
                      onChange={handleEventDetailsChange}
                      className="input-field"
                      title="תאריך האירוע"
                      aria-label="תאריך האירוע"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    שעות האירוע
                  </label>
                  <input
                      type="text"
                      name="event_hours"
                      value={eventDetails.event_hours}
                      onChange={handleEventDetailsChange}
                      className="input-field"
                      placeholder="לדוגמה: 09:00-17:00"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  הערות מיוחדות
                </label>
                <textarea
                    name="special_notes"
                    value={eventDetails.special_notes}
                    onChange={handleEventDetailsChange}
                    className="input-field h-24 resize-none"
                    placeholder="הערות מיוחדות שיופיעו בתבנית..."
                />
              </div>
            </div>

            {/* פריטי הצעה */}
            <QuoteItemsInput items={items} onItemsChange={handleItemsChange} />

            {/* סיכום */}
            <QuoteSummary
                items={items}
                discountPercent={discountPercent}
                onDiscountChange={handleDiscountChange}
            />

            {/* כפתור שמירה */}
            <div className="flex flex-col items-center">
              <button
                  onClick={handleSaveQuote}
                  disabled={!canSave}
                  className="btn-success text-lg px-8 py-3"
                  title={disabledReason || undefined}
              >
                {loading ? 'שומר...' : '💾 שמור הצעת מחיר'}
              </button>

              {/* (אופציונלי) מחוון דיבאג קטן – אפשר למחוק אחרי הבדיקה */}
              {/* <div className="text-xs text-gray-600 mt-2">
              canSave: {String(canSave)} |
              client: {String(!!selectedClient)} |
              items: {items.length} |
              event_name: {String(!!eventDetails.event_name.trim())}
            </div> */}
            </div>
          </div>
        </div>
      </div>
  );
};

export default QuoteForm;
