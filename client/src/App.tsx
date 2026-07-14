import React, { useState, useEffect } from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { QuoteWithItems } from './types';
import QuotesList from './components/QuotesList';
import QuoteForm from './components/QuoteForm';
import QuoteDetails from './components/QuoteDetails';
import EmployeeManagement from './components/EmployeeManagement';
import AdminDashboard from './components/AdminDashboard';
import LoginPage from './components/LoginPage';
import ReminderService from './components/ReminderService';
import PushPermissionPrompt from './components/PushPermissionPrompt';
import { AdminPinModal } from './components/AdminPinModal';
import { listenToForegroundMessages } from './services/firebaseMessaging';

/** מסך יחיד פעיל - מונע התנגשויות בין דגלי תצוגה נפרדים */
type View =
  | { name: 'home' }
  | { name: 'employees' }
  | { name: 'dashboard' }
  | { name: 'newQuote' }
  | { name: 'quoteDetails'; quoteId: number };

function App() {
  const { user, signOut, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // האזנה להתראות push כשהאפליקציה פתוחה (הרישום עצמו מנוהל ב-PushPermissionPrompt)
  useEffect(() => {
    if (!user?.email) return;

    let unsubscribe: (() => void) | null = null;
    listenToForegroundMessages((payload) => {
      // כשהאפליקציה פתוחה הדפדפן לא מציג התראה אוטומטית - נציג ידנית
      const title = payload.notification?.title || 'התראה חדשה';
      const body = payload.notification?.body || '';
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logo192.png', dir: 'rtl', lang: 'he' });
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.email]);

  const [view, setView] = useState<View>({ name: 'home' });
  const [duplicateQuoteData, setDuplicateQuoteData] = useState<QuoteWithItems | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleQuoteSelect = (quoteId: number) => {
    setView({ name: 'quoteDetails', quoteId });
  };

  const handleNewQuote = () => {
    setDuplicateQuoteData(null);
    setView({ name: 'newQuote' });
  };

  const handleBack = () => {
    setDuplicateQuoteData(null);
    setView({ name: 'home' });
  };

  const handleDuplicateQuote = (quoteData: QuoteWithItems) => {
    setDuplicateQuoteData(quoteData);
    setView({ name: 'newQuote' });
  };

  // כניסה חשאית לדשבורד: לחיצה על הכותרת פותחת חלונית PIN (לאדמין בלבד)
  const handleTitleClick = () => {
    if (!isAdmin) return;
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setView({ name: 'dashboard' });
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

  const renderView = () => {
    switch (view.name) {
      case 'dashboard':
        return <AdminDashboard onBack={handleBack} onQuoteSelect={handleQuoteSelect} />;
      case 'employees':
        return <EmployeeManagement onBack={handleBack} />;
      case 'newQuote':
        return <QuoteForm onBack={handleBack} duplicateData={duplicateQuoteData || undefined} />;
      case 'quoteDetails':
        return <QuoteDetails quoteId={view.quoteId} onBack={handleBack} onDuplicate={handleDuplicateQuote} />;
      case 'home':
        return (
          <>
            <div className="bg-gray-50 dark:bg-gray-900 p-6 mb-0">
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setView({ name: 'employees' })}
                  className="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 text-lg font-medium shadow-md hover:shadow-lg transition-all"
                >
                  👥 {isAdmin ? 'ניהול עובדים' : 'רישום שעות'}
                </button>
                {isAdmin && (
                  <button
                    onClick={handleNewQuote}
                    className="px-6 py-3 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 text-lg font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    📝 הצעת מחיר חדשה
                  </button>
                )}
              </div>
            </div>
            {isAdmin && <QuotesList onQuoteSelect={handleQuoteSelect} />}
          </>
        );
    }
  };

  return (
    <ReminderService>
      <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {user?.email && <PushPermissionPrompt userEmail={user.email} />}
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
            <h1
              onClick={handleTitleClick}
              className="text-2xl font-bold text-center flex-1 text-gray-900 dark:text-white select-none cursor-default"
            >
              מערכת ניהול
            </h1>
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

        {showPinModal && (
          <AdminPinModal onSuccess={handlePinSuccess} onClose={() => setShowPinModal(false)} />
        )}

        {renderView()}
      </div>
    </ReminderService>
  );
}

export default App;
