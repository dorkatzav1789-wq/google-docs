import React, { useEffect, useRef, useState } from 'react';
import { Lock, X } from 'lucide-react';

const ADMIN_PIN = '1789';

interface AdminPinModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

/** חלונית קוד גישה לדשבורד הניהול (נפתחת בלחיצה על כותרת האפליקציה) */
export const AdminPinModal: React.FC<AdminPinModalProps> = ({ onSuccess, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onSuccess();
      return;
    }
    setError(true);
    setPin('');
    inputRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Lock className="w-4 h-4" />
            <h3 className="text-sm font-semibold">גישת ניהול</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <label htmlFor="admin-pin" className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
            הזן קוד גישה
          </label>
          <input
            ref={inputRef}
            id="admin-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            className={`w-full p-2.5 text-center tracking-[0.5em] text-lg rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-400 dark:border-red-600 focus:ring-red-400'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            }`}
          />
          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 text-center">קוד שגוי, נסה שוב</p>
          )}
          <button
            type="submit"
            disabled={!pin}
            className="mt-4 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            כניסה
          </button>
        </form>
      </div>
    </div>
  );
};
