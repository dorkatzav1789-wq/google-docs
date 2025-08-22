import React, { useState } from 'react';
import { QuoteItem } from '../types';
import { quotesAPI } from '../services/api';

interface QuoteItemsInputProps {
  items: QuoteItem[];
  onItemsChange: (items: QuoteItem[]) => void;
}

const QuoteItemsInput: React.FC<QuoteItemsInputProps> = ({
  items,
  onItemsChange,
}) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const parseItems = async () => {
    if (!text.trim()) return;

    try {
      setLoading(true);
      const parsedItems = await quotesAPI.parseText(text);
      onItemsChange(parsedItems);
    } catch (error) {
      console.error('שגיאה בפרסור פריטים:', error);
      alert('שגיאה בפרסור הפריטים');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!text.trim()) return;
    
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    parseItems();
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].total = newItems[index].unit_price * quantity - newItems[index].discount;
    onItemsChange(newItems);
  };

  const updateItemDiscount = (index: number, discount: number) => {
    const newItems = [...items];
    newItems[index].discount = discount;
    newItems[index].total = newItems[index].unit_price * newItems[index].quantity - discount;
    onItemsChange(newItems);
  };

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-gray-800">פריטי הצעת מחיר</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          הזן פריטים בפורמט: כמות שם_פריט מחיר|
        </label>
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="לדוגמה:&#10;2 מסך אולם סוויט 2500|&#10;1 הגברה 200 איש 2500|"
          className="input-field h-32 resize-none"
        />
        <button
          onClick={addItem}
          disabled={loading || !text.trim()}
          className="btn-primary mt-2"
        >
          {loading ? 'מעבד...' : 'הוסף פריטים'}
        </button>
      </div>

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
                  <td className="table-cell font-medium">{item.name}</td>
                  <td className="table-cell text-sm text-gray-600">{item.description}</td>
                  <td className="table-cell">₪{item.unit_price.toLocaleString()}</td>
                  <td className="table-cell">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      title="כמות"
                      aria-label="כמות"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      min="0"
                      value={item.discount}
                      onChange={(e) => updateItemDiscount(index, parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      title="הנחה"
                      aria-label="הנחה"
                    />
                  </td>
                  <td className="table-cell font-bold">₪{item.total.toLocaleString()}</td>
                  <td className="table-cell">
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
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
    </div>
  );
};

export default QuoteItemsInput;
