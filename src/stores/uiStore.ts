import { create } from 'zustand';
import type { View } from '@/types';

interface UIState {
  view: View;
  routeParam: string | null;
  modal: ModalKind | null;
  modalPayload: unknown;
  setView: (view: View, param?: string | null) => void;
  openModal: (kind: ModalKind, payload?: unknown) => void;
  closeModal: () => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}

export type ModalKind =
  | 'expense_form'
  | 'expense_edit'
  | 'receipt_scanner'
  | 'group_settle_up'
  | 'group_invite'
  | 'group_create'
  | 'group_join'
  | 'export_modal'
  | 'budget_setup'
  | 'onboarding'
  | 'add_income';

export const useUIStore = create<UIState>((set) => ({
  view: 'dashboard',
  routeParam: null,
  modal: null,
  modalPayload: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  setView: (view, param = null) => set({ view, routeParam: param }),
  openModal: (kind, payload) => set({ modal: kind, modalPayload: payload ?? null }),
  closeModal: () => set({ modal: null, modalPayload: null }),
  setIsOnline: (online) => set({ isOnline: online }),
}));
