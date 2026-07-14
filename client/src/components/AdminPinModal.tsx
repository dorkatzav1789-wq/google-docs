import React, { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from 'components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { cn } from 'lib/utils';

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs gap-0 p-0 overflow-hidden">
        <DialogHeader className="flex-row items-center gap-2 space-y-0 border-b bg-muted/50 px-4 py-3 pe-12 text-right">
          <Lock className="h-4 w-4 text-foreground" />
          <div>
            <DialogTitle className="text-sm">גישת ניהול</DialogTitle>
            <DialogDescription className="sr-only">הזן קוד גישה לדשבורד הניהול</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4">
          <Label htmlFor="admin-pin" className="mb-2 block text-muted-foreground">
            הזן קוד גישה
          </Label>
          <Input
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
            className={cn(
              'text-center text-lg tracking-[0.5em]',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          {error && (
            <p className="mt-2 text-center text-xs text-destructive">קוד שגוי, נסה שוב</p>
          )}
          <Button type="submit" disabled={!pin} className="mt-4 w-full">
            כניסה
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
