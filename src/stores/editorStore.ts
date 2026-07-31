import { create } from 'zustand'
import type { Tool, FurnitureAsset, Asset } from '../engine/types'

export const FURNITURE_ASSETS: FurnitureAsset[] = [
  { id: 'sofa', label: 'Sofa', icon: '🛋', type: 'furniture', geometry: 'box', color: '#cc6644' },
  { id: 'table', label: 'Table', icon: '⬛', type: 'furniture', geometry: 'box', color: '#8B4513' },
  { id: 'chair', label: 'Chair', icon: '💺', type: 'furniture', geometry: 'cylinder', color: '#446688' },
]

interface EditorState {
  activeTool: Tool
  snapEnabled: boolean
  snapSize: number
  showGrid: boolean
  panelVisible: boolean
  assetLibraryVisible: boolean
  shareVisible: boolean
  placingFurniture: FurnitureAsset | null
  draggedAsset: Asset | null
  setActiveTool: (tool: Tool) => void
  setSnapEnabled: (enabled: boolean) => void
  setSnapSize: (size: number) => void
  toggleGrid: () => void
  togglePanel: () => void
  toggleAssetLibrary: () => void
  toggleShare: () => void
  setPlacingFurniture: (asset: FurnitureAsset | null) => void
  setDraggedAsset: (asset: Asset | null) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  snapEnabled: true,
  snapSize: 1,
  showGrid: true,
  panelVisible: true,
  assetLibraryVisible: false,
  shareVisible: false,
  placingFurniture: null,
  draggedAsset: null,
  setActiveTool: (activeTool) => set({ activeTool, placingFurniture: null, draggedAsset: null }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setSnapSize: (snapSize) => set({ snapSize }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  togglePanel: () => set((s) => ({ panelVisible: !s.panelVisible })),
  toggleAssetLibrary: () => set((s) => ({ assetLibraryVisible: !s.assetLibraryVisible })),
  toggleShare: () => set((s) => ({ shareVisible: !s.shareVisible })),
  setPlacingFurniture: (placingFurniture) => set({ placingFurniture, activeTool: 'select', draggedAsset: null }),
  setDraggedAsset: (draggedAsset) => set({ draggedAsset, activeTool: 'select', placingFurniture: null }),
}))
