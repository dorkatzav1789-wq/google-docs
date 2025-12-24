import React from 'react';
import ItemsManager from './ItemsManager';
import AliasesManager from './AliasesManager';
import { useAuth } from '../context/AuthContext';

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const { user } = useAuth();

  // בדיקת הרשאות - רק admin יכול לראות את הדשבורד
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="container mx-auto p-6">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            אין לך הרשאה לגשת לדשבורד זה. רק משתמשים עם הרשאת admin יכולים לגשת.
          </div>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            חזור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">דשבורד ניהול</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            ← חזור
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ניהול פריטים */}
          <div className="lg:col-span-1">
            <ItemsManager />
          </div>

          {/* ניהול כינויים */}
          <div className="lg:col-span-1">
            <AliasesManager />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

