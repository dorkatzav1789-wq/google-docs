import React from 'react';
import ItemsManager from './ItemsManager';
import AliasesManager from './AliasesManager';
import EventTypesManager from './EventTypesManager';
import EventSignupsOverview from './EventSignupsOverview';
import QuotesList from './QuotesList';
import { useAuth } from '../context/AuthContext';
import { Button } from 'components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'components/ui/card';

interface AdminDashboardProps {
  onBack: () => void;
  onQuoteSelect?: (quoteId: number) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onQuoteSelect }) => {
  const { user } = useAuth();

  const handleQuoteSelect = (quoteId: number) => {
    if (onQuoteSelect) {
      onQuoteSelect(quoteId);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="container mx-auto p-6">
          <div className="rounded-lg border border-red-400 dark:border-red-600 bg-red-100 dark:bg-red-900/30 px-4 py-3 text-red-700 dark:text-red-300">
            אין לך הרשאה לגשת לדשבורד זה. רק משתמשים עם הרשאת admin יכולים לגשת.
          </div>
          <Button variant="secondary" onClick={onBack} className="mt-4">
            חזור
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto p-4 md:p-6">
        <Card className="sticky top-3 z-10 mb-6 border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 p-4 md:p-5">
            <div>
              <CardTitle className="text-2xl md:text-3xl text-gray-900 dark:text-white">
                דשבורד ניהול
              </CardTitle>
              <CardDescription className="mt-1 text-gray-600 dark:text-gray-300">
                ניהול פריטים, כינויים והצעות במקום אחד
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              onClick={onBack}
              className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white"
            >
              ← חזור
            </Button>
          </CardHeader>
        </Card>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900 dark:text-white">מחירון פריטים</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemsManager />
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900 dark:text-white">כינויים לפריטים</CardTitle>
            </CardHeader>
            <CardContent>
              <AliasesManager />
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900 dark:text-white">סוגי אירוע</CardTitle>
            </CardHeader>
            <CardContent>
              <EventTypesManager />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900 dark:text-white">הרשמות עובדים לאירועים</CardTitle>
          </CardHeader>
          <CardContent>
            <EventSignupsOverview />
          </CardContent>
        </Card>

        <Card className="mt-6 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <CardTitle className="text-xl text-gray-800 dark:text-white">הצעות קיימות</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              ניהול הצעות לפי תאריך וסטטוס
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <QuotesList onQuoteSelect={handleQuoteSelect} compact={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
