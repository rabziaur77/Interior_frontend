import { create } from 'zustand'
import type { WallCorner } from '../engine/types'

interface WallToolState {
  corners: WallCorner[]
  previewPoint: WallCorner | null
  addCorner: (corner: WallCorner) => void
  removeLastCorner: () => void
  setPreviewPoint: (point: WallCorner | null) => void
  clear: () => void
  isComplete: () => boolean
}

const CLOSE_THRESHOLD = 0.5

export const useWallToolStore = create<WallToolState>((set, get) => ({
  corners: [],
  previewPoint: null,
  addCorner: (corner) => set((s) => ({ corners: [...s.corners, corner] })),
  removeLastCorner: () => set((s) => ({ corners: s.corners.slice(0, -1) })),
  setPreviewPoint: (point) => set({ previewPoint: point }),
  clear: () => set({ corners: [], previewPoint: null }),
  isComplete: () => {
    const { corners } = get()
    if (corners.length < 3) return false
    const first = corners[0]
    const last = corners[corners.length - 1]
    return (
      Math.abs(last.x - first.x) < CLOSE_THRESHOLD &&
      Math.abs(last.z - first.z) < CLOSE_THRESHOLD
    )
  },
}))
