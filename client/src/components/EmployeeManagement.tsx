import React, { useState } from 'react';
import { WorkHoursTracker } from './WorkHoursTracker';
import { MonthlyReport } from './MonthlyReport';

type Tab = 'manage' | 'hours' | 'reports';

const EmployeesPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('manage');

  return (
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <h1>ניהול עובדים</h1>
          </div>
        </header>

        <main className="App-main">
          {/* טאבים פנימיים */}
          <div className="subnav">
            <button
                className={`subnav-btn ${tab === 'manage' ? 'active' : ''}`}
                onClick={() => setTab('manage')}
            >
              פרטי עובדים
            </button>
            <button
                className={`subnav-btn ${tab === 'hours' ? 'active' : ''}`}
                onClick={() => setTab('hours')}
            >
              רישום שעות
            </button>
            <button
                className={`subnav-btn ${tab === 'reports' ? 'active' : ''}`}
                onClick={() => setTab('reports')}
            >
              דוח חודשי
            </button>
          </div>

          <div className="card">
            {tab === 'hours' && <WorkHoursTracker />}
            {tab === 'reports' && <MonthlyReport />}
          </div>
        </main>
      </div>
  );
};

export default EmployeesPage;
