import { create } from 'zustand'

interface SelectionState {
  ids: string[]
  select: (id: string | null) => void
  toggle: (id: string) => void
  clear: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  ids: [],
  select: (id) => set({ ids: id ? [id] : [] }),
  toggle: (id) =>
    set((s) => ({
      ids: s.ids.includes(id) ? s.ids.filter((i) => i !== id) : [...s.ids, id],
    })),
  clear: () => set({ ids: [] }),
}))
