import React, { useState } from 'react';
import { Client } from '../types';
import { clientsAPI } from '../services/supabaseAPI';

interface NewClientFormProps {
  onClientCreated: (client: Client) => void;
  onCancel: () => void;
}

const NewClientForm: React.FC<NewClientFormProps> = ({
  onClientCreated,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company: '',
    company_id: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('שם הלקוח הוא שדה חובה');
      return;
    }

    try {
      setLoading(true);
      const result = await clientsAPI.create(formData);
      
      const newClient: Client = {
        id: result.id,
        ...formData,
        created_at: new Date().toISOString(),
      };
      
      onClientCreated(newClient);
    } catch (error) {
      console.error('שגיאה ביצירת לקוח:', error);
      alert('שגיאה ביצירת לקוח');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-gray-800">לקוח חדש</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            שם הלקוח *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="שם הלקוח"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מספר טלפון
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="input-field"
            placeholder="052-123-4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            שם החברה
          </label>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="input-field"
            placeholder="שם החברה"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ח.פ / ע.מ
          </label>
          <input
            type="text"
            name="company_id"
            value={formData.company_id}
            onChange={handleChange}
            className="input-field"
            placeholder="מספר ח.פ או ע.מ"
          />
        </div>

        <div className="flex space-x-3 space-x-reverse">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'שומר...' : 'שמור לקוח'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewClientForm;

