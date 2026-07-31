import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export interface GlbValidationResult {
  valid: boolean
  meshCount: number
  materialCount: number
  hasSceneHierarchy: boolean
  error?: string
}

const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
loader.setDRACOLoader(dracoLoader)

export function validateGlb(url: string): Promise<GlbValidationResult> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene
        let meshCount = 0
        let materialCount = 0

        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            meshCount++
            const mesh = child as THREE.Mesh
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                materialCount += mesh.material.length
              } else {
                materialCount++
              }
            }
          }
        })

        resolve({
          valid: true,
          meshCount,
          materialCount,
          hasSceneHierarchy: scene.children.length > 0,
        })
      },
      undefined,
      (err) => {
        resolve({
          valid: false,
          meshCount: 0,
          materialCount: 0,
          hasSceneHierarchy: false,
          error: err instanceof Error ? err.message : 'Unknown error loading GLB',
        })
      },
    )
  })
}

export function validateGlbBuffer(buffer: ArrayBuffer): Promise<GlbValidationResult> {
  return new Promise((resolve) => {
    loader.parse(
      buffer,
      '',
      (gltf) => {
        const scene = gltf.scene
        let meshCount = 0
        let materialCount = 0

        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            meshCount++
            const mesh = child as THREE.Mesh
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                materialCount += mesh.material.length
              } else {
                materialCount++
              }
            }
          }
        })

        resolve({
          valid: true,
          meshCount,
          materialCount,
          hasSceneHierarchy: scene.children.length > 0,
        })
      },
      (err) => {
        resolve({
          valid: false,
          meshCount: 0,
          materialCount: 0,
          hasSceneHierarchy: false,
          error: err instanceof Error ? err.message : 'Unknown error parsing GLB',
        })
      },
    )
  })
}
