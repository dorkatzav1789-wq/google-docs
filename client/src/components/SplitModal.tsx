import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSplit: (splitType: string) => void;
  itemName: string;
}

const SplitModal: React.FC<SplitModalProps> = ({ isOpen, onClose, onSelectSplit, itemName }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [customSplit, setCustomSplit] = useState('');

  if (!isOpen) return null;

  const splitTypes = ['A', 'B', 'C', 'D', 'E', 'F','מליאה sweet','מליאה joy'];

  const handleAddCustomSplit = () => {
    const value = customSplit.trim();
    if (!value) {
      alert('יש להקליד שם לפיצול החדש');
      return;
    }
    onSelectSplit(value);
    setCustomSplit('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
          הוספת פיצול
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          בחר סוג פיצול להוספה מתחת לפריט: <strong>{itemName}</strong>
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {splitTypes.map((splitType) => (
            <button
              key={splitType}
              onClick={() => onSelectSplit(splitType)}
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-white font-medium"
            >
              פיצול {splitType}
            </button>
          ))}
        </div>

        {isAdmin && (
          <div className="mb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">
              הוסף סוג פיצול חדש
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSplit}
                onChange={(e) => setCustomSplit(e.target.value)}
                placeholder="שם הפיצול (למשל: G או מליאה X)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSplit();
                  }
                }}
              />
              <button
                onClick={handleAddCustomSplit}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
              >
                הוסף
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitModal;

