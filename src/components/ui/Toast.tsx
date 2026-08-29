import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ToastProps {
  toast: { message: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-accent-green shrink-0" />,
    info: <Info className="w-5 h-5 text-accent-blue shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-accent-orange shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-accent-red shrink-0" />,
  };

  const bgColors = {
    success: 'bg-accent-green-soft border-accent-green/20 text-accent-green',
    info: 'bg-accent-blue-soft border-accent-blue/20 text-accent-blue',
    warning: 'bg-accent-orange-soft border-accent-orange/20 text-accent-orange',
    error: 'bg-accent-red-soft border-accent-red/20 text-accent-red',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-in max-w-sm w-full">
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-sm',
          bgColors[toast.type]
        )}
      >
        {icons[toast.type]}
        <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">
          {toast.message}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
