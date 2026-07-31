import type { SceneObject } from './types'
import { useSceneStore } from '../stores/sceneStore'

export interface Command {
  execute: () => void
  undo: () => void
}

export class AddObjectCommand implements Command {
  private object: SceneObject

  constructor(object: SceneObject) {
    this.object = object
  }

  execute() {
    useSceneStore.getState().addObject(this.object)
  }

  undo() {
    useSceneStore.getState().removeObject(this.object.id)
  }
}

export class RemoveObjectCommand implements Command {
  private object: SceneObject

  constructor(object: SceneObject) {
    this.object = object
  }

  execute() {
    useSceneStore.getState().removeObject(this.object.id)
  }

  undo() {
    useSceneStore.getState().addObject(this.object)
  }
}

export class UpdateObjectCommand implements Command {
  private id: string
  private snapshot: Partial<SceneObject>
  private previous: Partial<SceneObject>

  constructor(id: string, snapshot: Partial<SceneObject>, previous: Partial<SceneObject>) {
    this.id = id
    this.snapshot = snapshot
    this.previous = previous
  }

  execute() {
    useSceneStore.getState().updateObject(this.id, this.snapshot)
  }

  undo() {
    useSceneStore.getState().updateObject(this.id, this.previous)
  }
}

export class AddObjectsCommand implements Command {
  private objects: SceneObject[]

  constructor(objects: SceneObject[]) {
    this.objects = objects
  }

  execute() {
    const store = useSceneStore.getState()
    for (const obj of this.objects) {
      store.addObject(obj)
    }
  }

  undo() {
    const store = useSceneStore.getState()
    for (const obj of this.objects) {
      store.removeObject(obj.id)
    }
  }
}
