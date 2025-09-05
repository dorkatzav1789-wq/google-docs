import React, { useEffect, useState } from 'react';
import { QuoteItem, Item } from '../types';
import { quotesAPI, itemsAPI, aliasesAPI } from '../services/api';

interface QuoteItemsInputProps {
  items: QuoteItem[];
  onItemsChange: (items: QuoteItem[]) => void;
}

type UnknownLine = {
  line: string;
  quantity: number;
  raw_text: string;
  unit_price: number | null; // מחיר ליחידה מהמשתמש (אם נכתב)
};

const QuoteItemsInput: React.FC<QuoteItemsInputProps> = ({ items, onItemsChange }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  // שורות שלא זוהו
  const [unknown, setUnknown] = useState<UnknownLine[]>([]);

  // כל הפריטים הקיימים - נטען פעם אחת
  const [allItems, setAllItems] = useState<Item[]>([]);

  // תיבות פעולה לכל unknown
  const [createForm, setCreateForm] = useState<{
    idx: number | null;
    name: string;
    description: string;
    price: number | ''; // מחיר קטלוגי ליחידה (לפריט החדש)
    alsoAlias: boolean;
  }>({ idx: null, name: '', description: '', price: '', alsoAlias: true });

  const [aliasForm, setAliasForm] = useState<{
    idx: number | null;
    search: string;
    results: Item[];
    selected: Item | null;
    overridePrice: number | ''; // אופציונלי: דריסת מחיר ליחידה
  }>({ idx: null, search: '', results: [], selected: null, overridePrice: '' });

  // טעינת כל הפריטים פעם אחת
  useEffect(() => {
    const loadAllItems = async () => {
      try {
        const data = await itemsAPI.getAll();
        setAllItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('שגיאה בטעינת פריטים:', error);
        setAllItems([]);
      }
    };
    loadAllItems();
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value);

  const addParsedToList = (parsed: QuoteItem[]) => {
    const merged = [...items, ...parsed];
    onItemsChange(merged);
  };

  const parseItems = async () => {
    if (!text.trim()) return;
    try {
      setLoading(true);
      const resp = await quotesAPI.parseText(text);
      // מצרפים את המזוהים
      addParsedToList(resp.items || []);
      // מציגים את הלא מזוהים לפעולה
      setUnknown(resp.unknown || []);
      // מרוקנים את הטקסט
      setText('');
    } catch (error) {
      console.error('שגיאה בפרסור פריטים:', error);
      alert('שגיאה בפרסור הפריטים');
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    const q = Math.max(1, quantity || 1);
    newItems[index].quantity = q;
    newItems[index].total = newItems[index].unit_price * q - (newItems[index].discount || 0);
    onItemsChange(newItems);
  };

  const updateItemDiscount = (index: number, discount: number) => {
    const newItems = [...items];
    const d = Math.max(0, discount || 0);
    newItems[index].discount = d;
    newItems[index].total = newItems[index].unit_price * newItems[index].quantity - d;
    onItemsChange(newItems);
  };

  // ----- פעולות על unknown -----

  const openCreateForm = (idx: number) => {
    const u = unknown[idx];
    setCreateForm({
      idx,
      name: u.raw_text,
      description: '',
      price: u.unit_price ?? 0, // נניח כברירת מחדל למחיר הקטלוגי את מה שנכתב
      alsoAlias: true,
    });
    setAliasForm({ idx: null, search: '', results: [], selected: null, overridePrice: '' });
  };

  const submitCreate = async () => {
    if (createForm.idx == null) return;
    try {
      const priceNum = Number(createForm.price ?? 0);
      if (!createForm.name || isNaN(priceNum)) {
        alert('שם ומחיר נדרשים');
        return;
      }

      // 1) יצירת פריט בקטלוג (מחיר קטלוגי)
      const newItem = await itemsAPI.create({
        name: createForm.name,
        description: createForm.description || '',
        price: priceNum,
      });

      // 2) יצירת alias מהטקסט המקורי (אם ביקשנו)
      const u = unknown[createForm.idx];
      if (createForm.alsoAlias && u?.raw_text && u.raw_text !== newItem.name) {
        await aliasesAPI.create({
          alias: u.raw_text,
          item_name: newItem.name,
        });
      }

      // 3) הוספה לרשימת הפריטים בהצעה
      //    פירוש חדש: u.unit_price => מחיר ליחידה שהמשתמש כתב (אם כתב)
      const qty = Math.max(1, u.quantity || 1);
      const typedUnit = typeof u.unit_price === 'number' ? u.unit_price : null;
      const catalogUnit = Number(newItem.price || 0);
      const appliedUnit = typedUnit ?? catalogUnit; // מחיר ליחידה בפועל להצעה הזו

      const qi: QuoteItem = {
        name: newItem.name,
        description: newItem.description,
        unit_price: appliedUnit,          // מחיר ליחידה בפועל
        quantity: qty,
        discount: 0,                      // אין הנחה — המחיר כבר מותאם ליחידה
        total: appliedUnit * qty,         // מחיר ליחידה × כמות
      };

      addParsedToList([qi]);

      // הסרה מ-unknown ואיפוס הטופס
      const copy = [...unknown];
      copy.splice(createForm.idx, 1);
      setUnknown(copy);
      setCreateForm({ idx: null, name: '', description: '', price: '', alsoAlias: true });
    } catch (e) {
      console.error('create item error:', e);
      alert('שגיאה ביצירת פריט');
    }
  };

  const openAliasForm = (idx: number) => {
    setAliasForm({ idx, search: '', results: allItems, selected: null, overridePrice: '' });
    setCreateForm({ idx: null, name: '', description: '', price: '', alsoAlias: true });
  };

  const handleSearch = async (q: string) => {
    setAliasForm(prev => ({ ...prev, search: q }));
    if (!q.trim()) {
      setAliasForm(prev => ({ ...prev, results: allItems }));
      return;
    }
    try {
      const res = await itemsAPI.search(q);
      setAliasForm(prev => ({ ...prev, results: res || [] }));
    } catch (e) {
      console.error('search error:', e);
      setAliasForm(prev => ({ ...prev, results: [] }));
    }
  };

  const submitAlias = async () => {
    if (aliasForm.idx == null || !aliasForm.selected) return;
    try {
      const u = unknown[aliasForm.idx];

      // 1) צור alias (כולל דריסת מחיר יחידה אם הוגדרה)
      await aliasesAPI.create({
        alias: u.raw_text,
        item_name: aliasForm.selected.name,
        price_override: aliasForm.overridePrice === '' ? null : Number(aliasForm.overridePrice),
      });

      // 2) הוסף לפריטים בהצעה (מחיר ליחידה בפועל לפי עדיפויות)
      const qty = Math.max(1, u.quantity || 1);
      const typedUnit = typeof u.unit_price === 'number' ? u.unit_price : null; // מחיר ליחידה מהקלט
      const unitFromOverride = aliasForm.overridePrice !== '' ? Number(aliasForm.overridePrice) : null;
      const unitBase = Number(aliasForm.selected.price || 0);

      const appliedUnit = typedUnit ?? unitFromOverride ?? unitBase; // מחיר ליחידה בפועל להצעה

      const qi: QuoteItem = {
        name: aliasForm.selected.name,
        description: aliasForm.selected.description,
        unit_price: appliedUnit,         // מחיר ליחידה בפועל
        quantity: qty,
        discount: 0,                     // אין הנחה — המחיר כבר מותאם ליחידה
        total: appliedUnit * qty,        // מחיר ליחידה × כמות
      };
      addParsedToList([qi]);

      // 3) הסר מהלא-מזוהים ואפס טופס
      const copy = [...unknown];
      copy.splice(aliasForm.idx, 1);
      setUnknown(copy);
      setAliasForm({ idx: null, search: '', results: [], selected: null, overridePrice: '' });
    } catch (e) {
      console.error('alias create error:', e);
      alert('שגיאה ביצירת כינוי');
    }
  };

  return (
      <div className="card">
        <h3 className="text-lg font-bold mb-4 text-gray-800">פריטי הצעת מחיר</h3>

        {/* קלט טקסטואלי לפריטים */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            הזן פריטים בפורמט: כמות שם_פריט מחיר|
          </label>
          <textarea
              value={text}
              onChange={handleTextChange}
              placeholder={`לדוגמה:\n2 מסך אולם סוויט 2500|\n3 מיק אלחוטי 300|`}
              className="input-field h-32 resize-none"
          />
          <button
              onClick={parseItems}
              disabled={loading || !text.trim()}
              className="btn-primary mt-2"
          >
            {loading ? 'מעבד...' : 'הוסף/פרסר פריטים'}
          </button>
        </div>

        {/* שורות שלא זוהו */}
        {unknown.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2 text-red-700">שורות שלא זוהו</h4>
              <div className="space-y-3">
                {unknown.map((u, idx) => (
                    <div key={idx} className="border border-red-200 rounded p-3 bg-red-50">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="text-sm text-gray-700"><b>טקסט:</b> {u.raw_text}</div>
                          <div className="text-sm text-gray-700">
                            <b>כמות:</b> {u.quantity} &nbsp;|&nbsp; <b>מחיר יחידה שנכתב:</b> {u.unit_price ?? '-'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="btn-success" onClick={() => openCreateForm(idx)}>+ צור פריט חדש</button>
                          <button className="btn-secondary" onClick={() => openAliasForm(idx)}>שייך כינוי לפריט קיים</button>
                        </div>
                      </div>

                      {/* טופס יצירת פריט חדש */}
                      {createForm.idx === idx && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                            <input
                                type="text"
                                placeholder="שם פריט"
                                className="p-2 border rounded"
                                value={createForm.name}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <input
                                type="number"
                                placeholder="מחיר יחידה (קטלוגי)"
                                className="p-2 border rounded"
                                value={createForm.price}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, price: e.target.value === '' ? '' : Number(e.target.value) }))}
                            />
                            <input
                                type="text"
                                placeholder="תיאור (אופציונלי)"
                                className="p-2 border rounded"
                                value={createForm.description}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                  type="checkbox"
                                  checked={createForm.alsoAlias}
                                  onChange={(e) => setCreateForm(prev => ({ ...prev, alsoAlias: e.target.checked }))}
                              />
                              שמור כינוי מהטקסט המקורי
                            </label>
                            <div className="md:col-span-4">
                              <button className="btn-primary" onClick={submitCreate}>שמור והוסף להצעה</button>
                            </div>
                          </div>
                      )}

                      {/* טופס שיוך כינוי לפריט קיים */}
                      {aliasForm.idx === idx && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                            <input
                                type="text"
                                placeholder="חיפוש פריט קיים"
                                className="p-2 border rounded"
                                value={aliasForm.search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            <select
                                className="p-2 border rounded"
                                value={aliasForm.selected?.id ?? ''}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  const found = aliasForm.results.find(r => String(r.id) === id) || null;
                                  setAliasForm(prev => ({ ...prev, selected: found }));
                                }}
                                aria-label="בחר פריט קיים"
                            >
                              <option value="">בחר פריט...</option>
                              {aliasForm.results.length > 0 ? (
                                  aliasForm.results.map(r => (
                                      <option key={String(r.id)} value={String(r.id)}>
                                        {r.name} — ₪{r.price}
                                      </option>
                                  ))
                              ) : (
                                  <option value="" disabled>לא נמצאו פריטים תואמים</option>
                              )}
                            </select>

                            <input
                                type="number"
                                placeholder="דריסת מחיר יחידה (אופציונלי)"
                                className="p-2 border rounded"
                                value={aliasForm.overridePrice}
                                onChange={(e) => setAliasForm(prev => ({
                                  ...prev,
                                  overridePrice: e.target.value === '' ? '' : Number(e.target.value)
                                }))}
                            />
                            <div>
                              <button className="btn-primary" onClick={submitAlias} disabled={!aliasForm.selected}>
                                שמור כינוי והוסף להצעה
                              </button>
                            </div>
                          </div>
                      )}
                    </div>
                ))}
              </div>
            </div>
        )}

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
