import type { SceneObject } from './types'

export const SCHEMA_VERSION = 1

export interface SceneFile {
  schemaVersion: number
  objects: SceneObject[]
}

function isTuple(v: unknown): v is [number, number, number] {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number')
}

function isValidObject(o: unknown): o is SceneObject {
  if (typeof o !== 'object' || o === null) return false
  const obj = o as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    isTuple(obj.position) &&
    isTuple(obj.rotation) &&
    isTuple(obj.scale) &&
    typeof obj.properties === 'object' &&
    obj.properties !== null
  )
}

export function serializeScene(objects: SceneObject[]): string {
  const scene: SceneFile = { schemaVersion: SCHEMA_VERSION, objects }
  return JSON.stringify(scene)
}

export function deserializeScene(json: string): SceneObject[] {
  let scene: unknown
  try {
    scene = JSON.parse(json)
  } catch {
    throw new Error('Scene data is corrupted and could not be read.')
  }

  if (typeof scene !== 'object' || scene === null) {
    throw new Error('Invalid scene data.')
  }

  const file = scene as Partial<SceneFile>
  if (typeof file.schemaVersion !== 'number') {
    throw new Error('Scene is missing a schema version.')
  }
  if (file.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`Scene was created with a newer app version (${file.schemaVersion}). Please update.`)
  }

  // Future migrations run here: `switch (file.schemaVersion) { case 0: ...; default: ... }`
  if (file.schemaVersion < SCHEMA_VERSION) {
    // No migrations yet; all current data is version 1.
  }

  return Array.isArray(file.objects) ? file.objects.filter(isValidObject) : []
}
