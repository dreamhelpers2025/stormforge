import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface Toast {
  id: string;
  message: string;
  kind: 'info' | 'success' | 'error';
}

interface ToastStore {
  toasts: Toast[];
  push: (msg: string, kind?: Toast['kind']) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (message, kind = 'info') => {
    const t: Toast = { id: nanoid(6), message, kind };
    set({ toasts: [...get().toasts, t] });
    setTimeout(() => get().dismiss(t.id), 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
}));
