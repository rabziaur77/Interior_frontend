import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.Camera | null = null

export function registerExportTargets(gl: THREE.WebGLRenderer, s: THREE.Scene, cam: THREE.Camera) {
  renderer = gl
  scene = s
  camera = cam
}

export function unregisterExportTargets() {
  renderer = null
  scene = null
  camera = null
}

function download(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function exportSceneAsPng(filename: string) {
  if (!renderer || !scene || !camera) throw new Error('Scene is not ready to export.')

  renderer.setClearColor('#ffffff', 1)
  renderer.render(scene, camera)
  const url = renderer.domElement.toDataURL('image/png')
  renderer.setClearColor('#000000', 0)
  download(url, filename)
}

export function exportSceneAsGlb(filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!scene) {
      reject(new Error('Scene is not ready to export.'))
      return
    }

    const exportable = new THREE.Group()
    scene.children.forEach((child) => {
      if (child.userData.exportable) {
        exportable.add(child.clone(true))
      }
    })

    if (exportable.children.length === 0) {
      reject(new Error('Nothing to export.'))
      return
    }

    const exporter = new GLTFExporter()
    exporter.parse(
      exportable,
      (result) => {
        const blob = result instanceof ArrayBuffer
          ? new Blob([result], { type: 'model/gltf-binary' })
          : new Blob([JSON.stringify(result)], { type: 'model/gltf+json' })
        download(URL.createObjectURL(blob), filename)
        resolve()
      },
      (err) => reject(err instanceof Error ? err : new Error('GLB export failed.')),
      { binary: true },
    )
  })
}
