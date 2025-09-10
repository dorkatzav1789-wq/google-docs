import React, { useState, useEffect } from 'react';
import './App.css';
import QuoteForm from './components/QuoteForm';
import QuotesList from './components/QuotesList';
import QuoteDetails from './components/QuoteDetails';
import NewClientForm from './components/NewClientForm';
import EmployeesPage from './components/EmployeeManagement';
import ReminderService from './components/ReminderService';

type Page =
    | 'quotes'
    | 'new-quote'
    | 'quote-details'
    | 'new-client'
    | 'employees';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('quotes');
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleQuoteSaved = () => setCurrentPage('quotes');
  const handleClientCreated = () => setCurrentPage('quotes');
  const handleQuoteSelect = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setCurrentPage('quote-details');
  };
  const handleBackToList = () => {
    setCurrentPage('quotes');
    setSelectedQuoteId(null);
  };
  const handleNewQuote = () => setCurrentPage('new-quote');
  const handleNewClient = () => setCurrentPage('new-client');

  if (loading) {
    return (
        <div className="App">
          <div className="loading">
            <h2>טוען נתונים...</h2>
          </div>
        </div>
    );
  }

  if (currentPage === 'quote-details' && selectedQuoteId) {
    return (
        <ReminderService>
          <div className="App">
            <QuoteDetails quoteId={selectedQuoteId} onBack={handleBackToList} />
          </div>
        </ReminderService>
    );
  }

  if (currentPage === 'new-quote') {
    return (
        <ReminderService>
          <div className="App">
            <header className="App-header">
              <div className="header-content">
                <button onClick={handleBackToList} className="btn-back">
                  ← חזור להצעות קיימות
                </button>
                <h1>יצירת הצעת מחיר חדשה</h1>
              </div>
            </header>
            <main className="App-main">
              <div className="quote-form-container">
                <QuoteForm onQuoteSaved={handleQuoteSaved} />
              </div>
            </main>
          </div>
        </ReminderService>
    );
  }

  if (currentPage === 'new-client') {
    return (
        <ReminderService>
          <div className="App">
            <header className="App-header">
              <div className="header-content">
                <button onClick={handleBackToList} className="btn-back">
                  ← חזור להצעות קיימות
                </button>
                <h1>הוספת לקוח חדש</h1>
              </div>
            </header>
            <main className="App-main">
              <div className="new-client-container">
                <NewClientForm onClientCreated={handleClientCreated} onCancel={handleBackToList} />
              </div>
            </main>
          </div>
        </ReminderService>
    );
  }

  if (currentPage === 'employees') {
    return (
        <ReminderService>
          <EmployeesPage />
        </ReminderService>
    );
  }

  // עמוד ראשי
  return (
      <ReminderService>
        <div className="App">
          <header className="App-header">
            <h1>מערכת ניהול הצעות מחיר ושעות עבודה</h1>

            <div className="header-buttons">
              <button onClick={handleNewQuote} className="btn-primary">
                + הצעת מחיר חדשה
              </button>
              <button onClick={handleNewClient} className="btn-secondary">
                + לקוח חדש
              </button>
              {/* ← כפתור חדש: ניהול עובדים */}
              <button onClick={() => setCurrentPage('employees')} className="btn-secondary">
                ⚙️ ניהול עובדים
              </button>
            </div>
          </header>

          <main className="App-main">
            <div className="quotes-container">
              <h2>הצעות מחיר קיימות</h2>
              <QuotesList onQuoteSelect={handleQuoteSelect} />
            </div>
          </main>
        </div>
      </ReminderService>
  );
}

export default App;
