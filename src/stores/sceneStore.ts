import { create } from 'zustand'
import type { SceneObject } from '../engine/types'

interface SceneState {
  objects: SceneObject[]
  addObject: (obj: SceneObject) => void
  removeObject: (id: string) => void
  updateObject: (id: string, partial: Partial<SceneObject>) => void
  getObject: (id: string) => SceneObject | undefined
  loadObjects: (objects: SceneObject[]) => void
  clear: () => void
}

function generateId(): string {
  return crypto.randomUUID()
}

export { generateId }

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: [],
  addObject: (obj) => set((s) => ({ objects: [...s.objects, obj] })),
  removeObject: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })),
  updateObject: (id, partial) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...partial } : o)),
    })),
  getObject: (id) => get().objects.find((o) => o.id === id),
  loadObjects: (objects) => set({ objects }),
  clear: () => set({ objects: [] }),
}))
