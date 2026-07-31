import { create } from 'zustand'

interface ProjectState {
  id: string | null
  name: string
  version: number
  shareToken: string | null
  dirty: boolean
  saving: boolean
  revision: number
  setName: (name: string) => void
  setProject: (id: string, name: string, version: number, shareToken: string | null) => void
  setShareToken: (shareToken: string | null) => void
  markDirty: () => void
  setSaving: (saving: boolean) => void
  markSaved: (version: number) => void
  clear: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  id: null,
  name: '',
  version: 1,
  shareToken: null,
  dirty: false,
  saving: false,
  revision: 0,
  setName: (name) => set((s) => ({ name, dirty: true, revision: s.revision + 1 })),
  setProject: (id, name, version, shareToken) => set({ id, name, version, shareToken, dirty: false, revision: 0 }),
  setShareToken: (shareToken) => set({ shareToken }),
  markDirty: () => set((s) => ({ dirty: true, revision: s.revision + 1 })),
  setSaving: (saving) => set({ saving }),
  markSaved: (version) => set({ version, dirty: false }),
  clear: () => set({ id: null, name: '', version: 1, shareToken: null, dirty: false, saving: false, revision: 0 }),
}))
