import type { SceneObject, WallCorner } from './types'
import { AddObjectsCommand } from './Command'
import { useHistoryStore } from '../stores/historyStore'
import { generateId } from '../stores/sceneStore'
import { useWallToolStore } from '../stores/wallToolStore'

export function createWallObject(start: WallCorner, end: WallCorner, height = 3, thickness = 0.15): SceneObject {
  const dx = end.x - start.x
  const dz = end.z - start.z
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dz, dx)
  return {
    id: generateId(),
    type: 'wall',
    position: [(start.x + end.x) / 2, height / 2, (start.z + end.z) / 2],
    rotation: [0, -angle, 0],
    scale: [length, height, thickness],
    properties: { color: '#cccccc', start, end, height, thickness },
  }
}

export function createFloorObject(corners: WallCorner[]): SceneObject {
  return {
    id: generateId(),
    type: 'floor',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    properties: { corners, color: '#e0e0e0' },
  }
}

export function commitRoom() {
  const wallState = useWallToolStore.getState()
  const { corners } = wallState
  if (corners.length < 2) return

  const objects: SceneObject[] = []

  if (corners.length === 2) {
    objects.push(createWallObject(corners[0], corners[1]))
  } else {
    const pts = [...corners, corners[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      objects.push(createWallObject(pts[i], pts[i + 1]))
    }
    objects.push(createFloorObject(corners))
  }

  useHistoryStore.getState().executeCommand(new AddObjectsCommand(objects))
  useWallToolStore.getState().clear()
}
