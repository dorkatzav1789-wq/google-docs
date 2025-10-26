import React, { useState, useEffect } from 'react';
import { Alias, Item } from '../types';
import { aliasesAPI, itemsAPI } from '../services/supabaseAPI';

const AliasesManager: React.FC = () => {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAlias, setEditingAlias] = useState<Alias | null>(null);
  const [editForm, setEditForm] = useState({ alias: '', item_name: '', price_override: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlias, setNewAlias] = useState({ alias: '', item_name: '', price_override: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [aliasesData, itemsData] = await Promise.all([
        aliasesAPI.getAll(),
        itemsAPI.getAll()
      ]);
      setAliases(aliasesData);
      setItems(itemsData);
    } catch (error) {
      console.error('שגיאה בטעינת נתונים:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (alias: Alias) => {
    setEditingAlias(alias);
    setEditForm({
      alias: alias.alias,
      item_name: alias.item_name,
      price_override: alias.price_override || 0
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAlias) return;
    
    try {
      await aliasesAPI.update(editingAlias.id, {
        alias: editForm.alias,
        item_name: editForm.item_name,
        price_override: editForm.price_override > 0 ? editForm.price_override : null
      });
      await loadData();
      setEditingAlias(null);
    } catch (error) {
      console.error('שגיאה בעדכון alias:', error);
      alert('שגיאה בעדכון alias');
    }
  };

  const handleDelete = async (aliasId: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את ה-alias?')) {
      return;
    }
    
    try {
      await aliasesAPI.delete(aliasId);
      await loadData();
    } catch (error) {
      console.error('שגיאה במחיקת alias:', error);
      alert('שגיאה במחיקת alias');
    }
  };

  const handleAddNewAlias = async () => {
    if (!newAlias.alias.trim() || !newAlias.item_name.trim()) {
      alert('יש למלא alias ושם פריט');
      return;
    }
    
    try {
      await aliasesAPI.create({
        alias: newAlias.alias,
        item_name: newAlias.item_name,
        price_override: newAlias.price_override > 0 ? newAlias.price_override : null
      });
      await loadData();
      setNewAlias({ alias: '', item_name: '', price_override: 0 });
      setShowAddForm(false);
    } catch (error) {
      console.error('שגיאה בהוספת alias:', error);
      alert('שגיאה בהוספת alias');
    }
  };

  const filteredAliases = aliases.filter(alias =>
    alias.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alias.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">ניהול כינויים</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          {showAddForm ? '✖️ ביטול' : '➕ כינוי חדש'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-3 border border-green-300 dark:border-green-600 rounded-lg bg-green-50 dark:bg-green-900/20">
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">הוספת כינוי חדש</h4>
          <input
            type="text"
            value={newAlias.alias}
            onChange={(e) => setNewAlias({...newAlias, alias: e.target.value})}
            placeholder="כינוי (למשל: חלון סוויט)"
            className="input-field w-full mb-2"
          />
          <select
            value={newAlias.item_name}
            onChange={(e) => setNewAlias({...newAlias, item_name: e.target.value})}
            className="input-field w-full mb-2"
            title="בחר פריט"
            aria-label="בחר פריט"
          >
            <option value="">בחר פריט</option>
            {items.map(item => (
              <option key={item.id} value={item.name}>{item.name}</option>
            ))}
          </select>
          <input
            type="number"
            value={newAlias.price_override}
            onChange={(e) => setNewAlias({...newAlias, price_override: parseFloat(e.target.value) || 0})}
            placeholder="מחיר override (אופציונלי)"
            className="input-field w-full mb-2"
          />
          <button onClick={handleAddNewAlias} className="btn-primary w-full text-sm">
            ➕ הוסף כינוי
          </button>
        </div>
      )}
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="חיפוש כינוי..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field w-full"
        />
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">טוען כינויים...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredAliases.map((alias) => (
            <div key={alias.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
              {editingAlias?.id === alias.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.alias}
                    onChange={(e) => setEditForm({...editForm, alias: e.target.value})}
                    placeholder="כינוי"
                    className="input-field w-full"
                  />
                  <select
                    value={editForm.item_name}
                    onChange={(e) => setEditForm({...editForm, item_name: e.target.value})}
                    className="input-field w-full"
                    title="בחר פריט"
                    aria-label="בחר פריט"
                  >
                    <option value="">בחר פריט</option>
                    {items.map(item => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={editForm.price_override}
                    onChange={(e) => setEditForm({...editForm, price_override: parseFloat(e.target.value) || 0})}
                    placeholder="מחיר override"
                    className="input-field w-full"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="btn-primary flex-1 text-sm">שמור</button>
                    <button onClick={() => setEditingAlias(null)} className="btn-secondary flex-1 text-sm">ביטול</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 dark:text-white">
                      <span className="text-blue-600 dark:text-blue-400">{alias.alias}</span>
                      {' → '}
                      <span>{alias.item_name}</span>
                    </div>
                    {alias.price_override && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        מחיר override: ₪{alias.price_override.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mr-2">
                    <button
                      onClick={() => handleEdit(alias)}
                      className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      title="עריכה"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(alias.id)}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
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

      {filteredAliases.length === 0 && !loading && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          לא נמצאו כינויים
        </div>
      )}
    </div>
  );
};

export default AliasesManager;
