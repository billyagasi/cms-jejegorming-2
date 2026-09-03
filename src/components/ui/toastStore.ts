import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info' | 'wa';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  detail?: React.ReactNode;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function pushToast(toast: Omit<ToastItem, 'id'>): void {
  useToastStore.getState().push(toast);
}
