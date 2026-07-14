import React, { useState, useEffect } from 'react';
import { Item } from '../types';
import { itemsAPI } from '../services/supabaseAPI';

const ItemsManager: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', price: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: 0 });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await itemsAPI.getAll();
      setItems(data);
    } catch (error) {
      console.error('שגיאה בטעינת פריטים:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      description: item.description || '',
      price: item.price
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
      await itemsAPI.update(editingItem.id, editForm);
      await loadItems();
      setEditingItem(null);
    } catch (error) {
      console.error('שגיאה בעדכון פריט:', error);
      alert('שגיאה בעדכון פריט');
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הפריט?')) {
      return;
    }
    
    try {
      await itemsAPI.delete(itemId);
      await loadItems();
    } catch (error) {
      console.error('שגיאה במחיקת פריט:', error);
      alert('שגיאה במחיקת פריט');
    }
  };

  const handleAddNewItem = async () => {
    if (!newItem.name.trim() || newItem.price <= 0) {
      alert('יש למלא שם פריט ומחיר תקין');
      return;
    }
    
    try {
      await itemsAPI.create(newItem);
      await loadItems();
      setNewItem({ name: '', description: '', price: 0 });
      setShowAddForm(false);
    } catch (error) {
      console.error('שגיאה בהוספת פריט:', error);
      alert('שגיאה בהוספת פריט');
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
        >
          {showAddForm ? '✖️ ביטול' : '➕ פריט חדש'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-600 dark:bg-green-900/20">
          <h4 className="mb-2 font-semibold text-green-800 dark:text-green-300">הוספת פריט חדש</h4>
          <input
            type="text"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            placeholder="שם פריט"
            className="input-field mb-2 w-full"
          />
          <textarea
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="תיאור"
            className="input-field mb-2 w-full"
            rows={2}
          />
          <input
            type="number"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
            placeholder="מחיר"
            className="input-field mb-2 w-full"
          />
          <button onClick={handleAddNewItem} className="btn-primary w-full text-sm">
            ➕ הוסף פריט
          </button>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="חיפוש פריט..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field w-full"
        />
      </div>

      {loading ? (
        <div className="py-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-2 text-gray-600 dark:text-gray-300">טוען פריטים...</p>
        </div>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/60"
            >
              {editingItem?.id === item.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="שם פריט"
                    className="input-field w-full"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="תיאור"
                    className="input-field w-full"
                    rows={2}
                  />
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                    placeholder="מחיר"
                    className="input-field w-full"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="btn-primary flex-1 text-sm">
                      שמור
                    </button>
                    <button onClick={() => setEditingItem(null)} className="btn-secondary flex-1 text-sm">
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 dark:text-white">{item.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{item.description}</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      ₪{item.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="mr-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      title="עריכה"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                      title="מחיקה"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredItems.length === 0 && !loading && (
        <div className="py-4 text-center text-gray-500 dark:text-gray-400">לא נמצאו פריטים</div>
      )}
    </div>
  );
};

export default ItemsManager;
