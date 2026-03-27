import React from 'react';
import ItemsManager from './ItemsManager';
import AliasesManager from './AliasesManager';
import QuotesList from './QuotesList';
import { useAuth } from '../context/AuthContext';

interface AdminDashboardProps {
  onBack: () => void;
  onQuoteSelect?: (quoteId: number) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onQuoteSelect }) => {
  const { user } = useAuth();
  
  // אם אין callback, נוסיף אחד פשוט שסוגר את הדשבורד
  const handleQuoteSelect = (quoteId: number) => {
    if (onQuoteSelect) {
      onQuoteSelect(quoteId);
    }
  };

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
      <div className="container mx-auto p-4 md:p-6">
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 shadow-sm p-4 md:p-5 flex flex-wrap justify-between items-center gap-3 sticky top-3 z-10 backdrop-blur">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">דשבורד ניהול</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">ניהול פריטים, כינויים והצעות במקום אחד</p>
          </div>
          <button
            onClick={onBack}
            className="h-10 px-4 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700"
          >
            ← חזור
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6">
          {/* ניהול פריטים */}
          <div className="lg:col-span-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-lg">📦</span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">מחירון פריטים</h2>
            </div>
            <ItemsManager />
          </div>

          {/* ניהול כינויים */}
          <div className="lg:col-span-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-lg">🏷️</span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">כינויים לפריטים</h2>
            </div>
            <AliasesManager />
          </div>
        </div>

        {/* רשימת הצעות */}
        <div className="mt-6">
          <div className="card rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">הצעות קיימות</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">ניהול הצעות לפי תאריך וסטטוס</p>
            </div>
            <QuotesList onQuoteSelect={handleQuoteSelect} compact={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

