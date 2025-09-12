import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { clientsAPI } from '../services/supabaseAPI';

interface ClientSelectorProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client) => void;
  onNewClient: () => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  selectedClient,
  onClientSelect,
  onNewClient,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
            <div
              key={client.id}
              onClick={() => onClientSelect(client)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedClient?.id === client.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="font-semibold text-gray-800 dark:text-white">{client.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{client.company}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{client.phone}</div>
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

