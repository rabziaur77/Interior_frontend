export type Tool = 'select' | 'move' | 'rotate' | 'scale' | 'wall'

export interface SceneObject {
  id: string
  type: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  properties: Record<string, unknown>
}

export interface WallCorner {
  x: number
  z: number
}

export interface FurnitureAsset {
  id: string
  label: string
  icon: string
  type: string
  geometry: 'box' | 'sphere' | 'cylinder'
  color: string
}

export interface Project {
  id: string
  name: string
  sceneData: string | null
  version: number
  createdAt: string
  updatedAt: string
  shareToken: string | null
}

export interface SharedScene {
  id: string
  name: string
  sceneData: string | null
  updatedAt: string
}

export interface MaterialSlot {
  name: string
  defaultColor: string | null
}

export interface Asset {
  id: string
  name: string
  category: string
  fileSize: number
  width: number
  height: number
  depth: number
  materialSlots: MaterialSlot[] | null
  createdAt: string
}
