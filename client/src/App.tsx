import React, { useState, useEffect } from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import QuotesList from './components/QuotesList';
import QuoteForm from './components/QuoteForm';
import QuoteDetails from './components/QuoteDetails';
import EmployeeManagement from './components/EmployeeManagement';
import LoginPage from './components/LoginPage';

function App() {
  const { user, signOut, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  console.log('App: Current user:', user, 'Loading:', loading);

  useEffect(() => {
    console.log('App: User changed:', user, 'Loading:', loading);
    if (user) {
      console.log('User is logged in with role:', user.role);
    }
  }, [user, loading]);
  
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [showEmployees, setShowEmployees] = useState(false);
  const [showNewQuote, setShowNewQuote] = useState(false);

  const handleQuoteSelect = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setShowNewQuote(false);
  };

  const handleNewQuote = () => {
    setSelectedQuoteId(null);
    setShowNewQuote(true);
  };

  const handleBack = () => {
    setSelectedQuoteId(null);
    setShowNewQuote(false);
    setShowEmployees(false);
  };

  const [showLogin, setShowLogin] = useState(!user);

  useEffect(() => {
    setShowLogin(!user);
  }, [user]);

  if (loading) {
    return <div>טוען...</div>;
  }

  if (showLogin) {
    return <LoginPage onLoginSuccess={() => setShowLogin(false)} />;
  }

  return (
    <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm p-4 mb-0 transition-colors border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex-1 flex justify-start">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={theme === 'light' ? 'מעבר למצב כהה' : 'מעבר למצב בהיר'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <h1 className="text-2xl font-bold text-center flex-1 text-gray-900 dark:text-white">מערכת ניהול</h1>
          <div className="flex-1 flex justify-end">
            <button
              onClick={async () => {
                await signOut();
              }}
              className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
            >
              התנתק
            </button>
          </div>
        </div>
      </header>
      {showEmployees ? (
        <>
          <EmployeeManagement onBack={handleBack} />
        </>
      ) : selectedQuoteId || showNewQuote ? (
        showNewQuote ? (
          <QuoteForm onBack={handleBack} />
        ) : (
          <QuoteDetails quoteId={selectedQuoteId!} onBack={handleBack} />
        )
      ) : (
        <>
          <div className="bg-gray-50 dark:bg-gray-900 p-6 mb-0">
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowEmployees(true)}
                className="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 text-lg font-medium shadow-md hover:shadow-lg transition-all"
              >
                👥 {user?.role === 'admin' ? 'ניהול עובדים' : 'רישום שעות'}
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={handleNewQuote}
                  className="px-6 py-3 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 text-lg font-medium shadow-md hover:shadow-lg transition-all"
                >
                  📝 הצעת מחיר חדשה
                </button>
              )}
            </div>
          </div>
          {user?.role === 'admin' && <QuotesList onQuoteSelect={handleQuoteSelect} />}
        </>
      )}
    </div>
  );
}

export default App;