import React from 'react';
import { QuoteItem } from '../types';

interface QuoteSummaryProps {
  items: QuoteItem[];
  discountPercent: number;
  onDiscountChange: (discount: number) => void;
}

const QuoteSummary: React.FC<QuoteSummaryProps> = ({
  items,
  discountPercent,
  onDiscountChange,
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const totalAfterDiscount = subtotal - discountAmount;
  const vatAmount = totalAfterDiscount * 0.18;
  const finalTotal = totalAfterDiscount + vatAmount;

  return (
    <div className="card bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">סיכום הצעת מחיר</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">סה"כ לפני הנחה:</span>
          <span className="font-bold text-gray-900 dark:text-white">₪{subtotal.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">הנחה כללית:</span>
          <div className="flex items-center space-x-2 space-x-reverse">
            {/*
            <select
              value={discountPercent}
              onChange={(e) => onDiscountChange(parseInt(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              title="בחר אחוז הנחה"
              aria-label="בחר אחוז הנחה"
            >
              <option value={0}>ללא הנחה</option>
              <option value={5}>5%</option>
              <option value={10}>10%</option>
            </select>
            */}
            <span className="font-bold text-red-600">-₪{discountAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-between items-center border-t pt-2">
          <span className="text-gray-700 dark:text-gray-300">סה"כ אחרי הנחה:</span>
          <span className="font-bold text-gray-900 dark:text-white">₪{totalAfterDiscount.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">מע"מ (18%):</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">+₪{vatAmount.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center border-t pt-2 text-lg">
          <span className="font-bold text-gray-800 dark:text-white">סה"כ כולל מע"מ:</span>
          <span className="font-bold text-green-600 dark:text-green-400 text-xl">₪{finalTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-semibold text-gray-800 dark:text-white mb-2">פירוט פריטים:</h4>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {items.length} פריטים בסך הכל
        </div>
      </div>
    </div>
  );
};

export default QuoteSummary;
