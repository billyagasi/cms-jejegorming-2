import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, X, XCircle, MessageCircle } from 'lucide-react';
import { useToastStore, ToastItem, ToastTone } from './toastStore';

const toneConfig: Record<ToastTone, { icon: React.ReactNode; ring: string; iconBg: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    ring: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    icon: <XCircle size={18} />,
    ring: 'border-l-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  info: {
    icon: <Info size={18} />,
    ring: 'border-l-brand-500',
    iconBg: 'bg-brand-50 dark:bg-brand-950/60',
    iconColor: 'text-brand-600 dark:text-brand-400',
  },
  wa: {
    icon: <MessageCircle size={18} />,
    ring: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
};

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, toast.duration ?? 5000);
    return () => clearTimeout(t);
  }, [onClose, toast.duration]);

  const cfg = toneConfig[toast.tone];

  return (
    <div
      className={`pointer-events-auto w-80 overflow-hidden rounded-xl border-l-4 border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 ${cfg.ring}`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg} ${cfg.iconColor}`}>
          {cfg.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">{toast.title}</p>
          {toast.message && <p className="mt-0.5 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{toast.message}</p>}
          {toast.detail && <div className="mt-2">{toast.detail}</div>}
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          aria-label="Tutup notifikasi"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[70] flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 48, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <ToastCard toast={toast} onClose={() => dismiss(toast.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
