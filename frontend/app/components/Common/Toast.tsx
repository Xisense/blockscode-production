"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    title?: string;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType, title?: string) => void;
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type, title }]);

        // Auto remove after 5 seconds
        setTimeout(() => removeToast(id), 5000);
    }, [removeToast]);

    const success = (msg: string, title?: string) => showToast(msg, 'success', title);
    const error = (msg: string, title?: string) => showToast(msg, 'error', title);
    const info = (msg: string, title?: string) => showToast(msg, 'info', title);
    const warning = (msg: string, title?: string) => showToast(msg, 'warning', title);

    return (
        <ToastContext.Provider value={{ toast: showToast, success, error, info, warning }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-80 pointer-events-none">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onClose }: { toast: Toast, onClose: () => void }) {
    const icons = {
        success: <CheckCircle2 className="text-emerald-500" size={20} />,
        error: <AlertCircle className="text-rose-500" size={20} />,
        info: <Info className="text-[var(--brand)]" size={20} />,
        warning: <AlertTriangle className="text-amber-500" size={20} />
    };

    const styles = {
        success: "border-emerald-100 bg-emerald-50/50 shadow-emerald-500/5",
        error: "border-rose-100 bg-rose-50/50 shadow-rose-500/5",
        info: "border-[var(--brand-light)] bg-[var(--brand-light)] shadow-[var(--brand)]/5",
        warning: "border-amber-100 bg-amber-50/50 shadow-amber-500/5"
    };

    return (
        <div className={`pointer-events-auto flex items-start gap-4 p-4 rounded-2xl border bg-white/80 backdrop-blur-md shadow-xl animate-in slide-in-from-right-full duration-300 ${styles[toast.type]}`}>
            <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1 min-w-0">
                {toast.title && <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800 mb-1">{toast.title}</h4>}
                <p className="text-xs font-bold text-slate-600 leading-relaxed">{toast.message}</p>
            </div>
            <button onClick={onClose} className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={14} />
            </button>
        </div>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};
