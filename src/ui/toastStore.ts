import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastMessage {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastState {
  current: ToastMessage | null;
  show: (message: string, action?: ToastAction) => void;
  hide: (id?: number) => void;
}

let nextId = 1;

/** Interaction state for the single toast shown above the tab bar. */
export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  show: (message, action) => set({ current: { id: nextId++, message, action } }),
  hide: (id) => {
    if (id === undefined || get().current?.id === id) set({ current: null });
  },
}));

export function showToast(message: string, action?: ToastAction): void {
  useToastStore.getState().show(message, action);
}
