import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'success' | 'info' | 'primary';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bgIcon: 'bg-rose-100 text-rose-700 border-rose-200',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30',
      icon: ShieldAlert
    },
    warning: {
      bgIcon: 'bg-amber-100 text-amber-800 border-amber-200',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30',
      icon: AlertTriangle
    },
    success: {
      bgIcon: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30',
      icon: CheckCircle2
    },
    info: {
      bgIcon: 'bg-blue-100 text-blue-800 border-blue-200',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30',
      icon: Info
    },
    primary: {
      bgIcon: 'bg-teal-100 text-teal-800 border-teal-200',
      btn: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/30',
      icon: CheckCircle2
    }
  };

  const style = variantStyles[variant] || variantStyles.primary;
  const IconComponent = style.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${style.bgIcon}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">{title}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Casa Mira South System Action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-700 font-medium leading-relaxed">
          {message}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={loading}
            className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 ${style.btn} disabled:opacity-50`}
          >
            {loading ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
