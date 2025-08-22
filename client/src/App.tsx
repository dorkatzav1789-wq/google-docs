import React, { useState, useEffect } from 'react';
import './App.css';
import QuoteForm from './components/QuoteForm';
import QuotesList from './components/QuotesList';
import QuoteDetails from './components/QuoteDetails';
import NewClientForm from './components/NewClientForm';
import { EmployeeManagement } from './components/EmployeeManagement';
import { WorkHoursTracker } from './components/WorkHoursTracker';
import { MonthlyReport } from './components/MonthlyReport';

interface Quote {
  id: number;
  client_name: string;
  event_name: string;
  event_date: string;
  total_before_discount: number;
  final_total: number;
  created_at: string;
}

interface Client {
  id: number;
  name: string;
  phone: string;
  company: string;
  company_id: string;
}

type Page = 'quotes' | 'new-quote' | 'quote-details' | 'new-client' | 'employees' | 'work-hours' | 'reports';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('quotes');
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleQuoteSaved = () => {
    // חזרה לעמוד הצעות קיימות אחרי שמירה
    setCurrentPage('quotes');
  };

  const handleClientCreated = () => {
    setCurrentPage('quotes');
  };

  const handleQuoteSelect = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setCurrentPage('quote-details');
  };

  const handleBackToList = () => {
    setCurrentPage('quotes');
    setSelectedQuoteId(null);
  };

  const handleNewQuote = () => {
    setCurrentPage('new-quote');
  };

  const handleNewClient = () => {
    setCurrentPage('new-client');
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <h2>טוען נתונים...</h2>
        </div>
      </div>
    );
  }

  // עמוד פרטי הצעה
  if (currentPage === 'quote-details' && selectedQuoteId) {
    return (
      <div className="App">
        <QuoteDetails 
          quoteId={selectedQuoteId} 
          onBack={handleBackToList}
        />
      </div>
    );
  }

  // עמוד יצירת הצעה חדשה
  if (currentPage === 'new-quote') {
    return (
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
    );
  }

  // עמוד הוספת לקוח חדש
  if (currentPage === 'new-client') {
    return (
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
            <NewClientForm 
              onClientCreated={handleClientCreated}
              onCancel={handleBackToList}
            />
          </div>
        </main>
      </div>
    );
  }

  // עמוד ראשי - רשימת הצעות קיימות
  return (
    <div className="App">
      <header className="App-header">
        <h1>מערכת ניהול הצעות מחיר ושעות עבודה</h1>
        <nav className="main-nav">
          <button 
            onClick={() => setCurrentPage('quotes')}
            className={`nav-btn ${currentPage === 'quotes' ? 'active' : ''}`}
          >
            הצעות מחיר
          </button>
          <button 
            onClick={() => setCurrentPage('employees')}
            className={`nav-btn ${currentPage === 'employees' ? 'active' : ''}`}
          >
            ניהול עובדים
          </button>
          <button 
            onClick={() => setCurrentPage('work-hours')}
            className={`nav-btn ${currentPage === 'work-hours' ? 'active' : ''}`}
          >
            שעות עבודה
          </button>
          <button 
            onClick={() => setCurrentPage('reports')}
            className={`nav-btn ${currentPage === 'reports' ? 'active' : ''}`}
          >
            דוחות
          </button>
        </nav>
        <div className="header-buttons">
          <button 
            onClick={handleNewQuote}
            className="btn-primary"
          >
            + הצעת מחיר חדשה
          </button>
          <button 
            onClick={handleNewClient}
            className="btn-secondary"
          >
            + לקוח חדש
          </button>
        </div>
      </header>

      <main className="App-main">
        {currentPage === 'quotes' && (
          <div className="quotes-container">
            <h2>הצעות מחיר קיימות</h2>
            <QuotesList 
              onQuoteSelect={handleQuoteSelect}
            />
          </div>
        )}
        
        {currentPage === 'employees' && (
          <EmployeeManagement />
        )}
        
        {currentPage === 'work-hours' && (
          <WorkHoursTracker />
        )}
        
        {currentPage === 'reports' && (
          <MonthlyReport />
        )}
      </main>
    </div>
  );
}

export default App;
