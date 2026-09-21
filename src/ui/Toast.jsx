import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { ok: CheckCircle2, success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    window.clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const notify = useCallback((message, kind = 'ok', duration = 4200) => {
    const id = ++idCounter;
    setToasts((current) => [...current, { id, message, kind }]);
    timers.current[id] = window.setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="ng-toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind] || Info;
          return (
            <div key={toast.id} className={`ng-toast ng-toast-${toast.kind}`}>
              <Icon size={17} />
              <span>{toast.message}</span>
              <button type="button" className="ng-toast-close" onClick={() => dismiss(toast.id)} aria-label="Fechar notificação">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() tem de ser usado dentro de <ToastProvider>.');
  return ctx;
}
