import React, { useState } from 'react';
import { QuoteItem } from '../types';
import { quotesAPI } from '../services/api';

interface QuoteItemsInputProps {
  items: QuoteItem[];
  onItemsChange: (items: QuoteItem[]) => void;
}

const makeBlankItem = (): QuoteItem => ({
  name: '',
  description: '',
  unit_price: 0,
  quantity: 1,
  discount: 0,
  total: 0,
});

const QuoteItemsInput: React.FC<QuoteItemsInputProps> = ({ items, onItemsChange }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  // מחשב total לפריט
  const recalc = (it: QuoteItem): QuoteItem => {
    const subtotal = Number(it.unit_price || 0) * Number(it.quantity || 0);
    const discount = Number(it.discount || 0);
    return { ...it, total: Math.max(0, subtotal - discount) };
  };

  const setItem = (idx: number, patch: Partial<QuoteItem>) => {
    const next = [...items];
    next[idx] = recalc({ ...next[idx], ...patch });
    onItemsChange(next);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // מוסיף את מה שנותח מהטקסט אל הקיימים (לא מחליף!)
  const addFromText = async () => {
    if (!text.trim()) return;
    try {
      setLoading(true);
      const parsedItems = await quotesAPI.parseText(text);
      // ודא ש-total נכון
      const normalized = parsedItems.map(recalc);
      onItemsChange([...items, ...normalized]);
      setText(''); // אופציונלי: לנקות אחרי הוספה
    } catch (error) {
      console.error('שגיאה בפרסור פריטים:', error);
      alert('שגיאה בפרסור הפריטים');
    } finally {
      setLoading(false);
    }
  };

  // הוסף שורה ריקה ידנית
  const addBlankItem = () => {
    onItemsChange([...items, makeBlankItem()]);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
      <div className="card">
        <h3 className="text-lg font-bold mb-4 text-gray-800">פריטי הצעת מחיר</h3>

        {/* אזור הוספה מהטקסט */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            הזן פריטים בפורמט: <b>כמות שם_פריט מחיר|</b> (שורה לכל פריט)
          </label>
          <textarea
              value={text}
              onChange={handleTextChange}
              placeholder={`לדוגמה:\n2 מסך אולם סוויט 2500|\n1 הגברה 200 איש 2500|`}
              className="input-field h-32 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
                onClick={addFromText}
                disabled={loading || !text.trim()}
                className="btn-primary"
            >
              {loading ? 'מעבד...' : '➕צור הצעת פריט חדש'}
            </button>
            <button onClick={addBlankItem} className="btn-secondary">
              ➕ הוסף שורה ריקה
            </button>
            <button onClick={() => setText('')} className="btn-secondary">
              🧹 נקה שדה טקסט
            </button>
          </div>
        </div>

        {/* טבלת פריטים */}
        {items.length > 0 && (
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
                  <th className="table-header">פעולות</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                      {/* שם הפריט */}
                      <td className="table-cell">
                        <input
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                            value={item.name}
                            onChange={(e) => setItem(index, { name: e.target.value })}
                            placeholder="לדוגמה: מערכת הגברה"
                        />
                      </td>

                      {/* תיאור */}
                      <td className="table-cell">
                        <input
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                            value={item.description || ''}
                            onChange={(e) => setItem(index, { description: e.target.value })}
                            placeholder="פרטים/מותג/דגם..."
                        />
                      </td>

                      {/* מחיר יחידה */}
                      <td className="table-cell">
                        <input
                            type="number"
                            min={0}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                            value={item.unit_price}
                            onChange={(e) => setItem(index, { unit_price: Number(e.target.value) || 0 })}
                            title="מחיר יחידה"
                            aria-label="מחיר יחידה"
                        />
                      </td>

                      {/* כמות */}
                      <td className="table-cell">
                        <input
                            type="number"
                            min={0}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                            value={item.quantity}
                            onChange={(e) => setItem(index, { quantity: Number(e.target.value) || 0 })}
                            title="כמות"
                            aria-label="כמות"
                        />
                      </td>

                      {/* הנחה */}
                      <td className="table-cell">
                        <input
                            type="number"
                            min={0}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                            value={item.discount}
                            onChange={(e) => setItem(index, { discount: Number(e.target.value) || 0 })}
                            title="הנחה"
                            aria-label="הנחה"
                        />
                      </td>

                      {/* סה"כ */}
                      <td className="table-cell font-bold">
                        ₪{(item.total || 0).toLocaleString('he-IL')}
                      </td>

                      {/* פעולות */}
                      <td className="table-cell text-center">
                        <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                            title="מחק פריט"
                            aria-label="מחק פריט"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
        )}

        {items.length === 0 && (
            <div className="text-gray-500">לא נוספו פריטים עדיין</div>
        )}
      </div>
  );
};

export default QuoteItemsInput;
