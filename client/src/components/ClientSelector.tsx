import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { clientsAPI } from '../services/supabaseAPI';

interface ClientSelectorProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client) => void;
  onNewClient: () => void;
  onClientUpdate?: () => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  selectedClient,
  onClientSelect,
  onNewClient,
  onClientUpdate,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', company: '', company_id: '' });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientsAPI.getAll();
      setClients(data);
    } catch (error) {
      console.error('שגיאה בטעינת לקוחות:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setEditForm({
      name: client.name,
      phone: client.phone || '',
      company: client.company || '',
      company_id: client.company_id || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    
    try {
      await clientsAPI.update(editingClient.id, editForm);
      await loadClients();
      setEditingClient(null);
      if (onClientUpdate) onClientUpdate();
    } catch (error) {
      console.error('שגיאה בעדכון לקוח:', error);
      alert('שגיאה בעדכון לקוח');
    }
  };

  const handleDelete = async (clientId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הלקוח?')) {
      return;
    }
    
    try {
      await clientsAPI.delete(clientId);
      await loadClients();
      setDeletingClient(null);
      if (onClientUpdate) onClientUpdate();
    } catch (error) {
      console.error('שגיאה במחיקת לקוח:', error);
      alert('שגיאה במחיקת לקוח');
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">בחירת לקוח</h3>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="חיפוש לקוח..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field w-full"
        />

      </div>


      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">טוען לקוחות...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredClients.map((client) => (
            <div key={client.id} className={`p-3 border rounded-lg transition-colors ${
              selectedClient?.id === client.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}>
              {editingClient?.id === client.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="שם"
                    className="input-field w-full"
                  />
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="טלפון"
                    className="input-field w-full"
                  />
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                    placeholder="חברה"
                    className="input-field w-full"
                  />
                  <input
                    type="text"
                    value={editForm.company_id}
                    onChange={(e) => setEditForm({...editForm, company_id: e.target.value})}
                    placeholder="ח.פ"
                    className="input-field w-full"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="btn-primary flex-1 text-sm">שמור</button>
                    <button onClick={() => setEditingClient(null)} className="btn-secondary flex-1 text-sm">ביטול</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div onClick={() => onClientSelect(client)} className="flex-1 cursor-pointer">
                    <div className="font-semibold text-gray-800 dark:text-white">{client.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{client.company}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{client.phone}</div>
                  </div>
                  <div className="flex gap-2 mr-2">
                    <button
                      onClick={(e) => handleEdit(client, e)}
                      className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      title="עריכה"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => handleDelete(client.id, e)}
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

      <button
        onClick={onNewClient}
        className="btn-primary w-full mt-4"
      >
        ➕ לקוח חדש
      </button>
    </div>
  );
};

export default ClientSelector;

