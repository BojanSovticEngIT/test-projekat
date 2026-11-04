import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ColumnPreferencesState {
  /** Hidden column keys per table id. A table without an entry shows every column. */
  hiddenColumns: Record<string, string[]>;
  setHiddenColumns: (tableId: string, keys: string[]) => void;
  resetColumns: (tableId: string) => void;
}

// Only a UI preference (which columns are visible) is stored, never any API data or credentials.
export const useColumnPreferencesStore = create<ColumnPreferencesState>()(
  persist(
    (set) => ({
      hiddenColumns: {},
      setHiddenColumns: (tableId, keys) => set((state) => ({ hiddenColumns: { ...state.hiddenColumns, [tableId]: keys } })),
      resetColumns: (tableId) =>
        set((state) => ({
          hiddenColumns: Object.fromEntries(Object.entries(state.hiddenColumns).filter(([id]) => id !== tableId))
        }))
    }),
    {
      name: 'column-preferences',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useColumnPreferencesStore;
