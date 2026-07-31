import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(
      (buf) => {
        this.result = buf
        this.onloadend?.()
      },
      (err) => this.onerror?.(err),
    )
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', '..', 'backend', 'seed-assets')
mkdirSync(outDir, { recursive: true })

function mat(color, { roughness = 0.8, metalness = 0 } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

function exportGlb(scene, fileName) {
  const exporter = new GLTFExporter()
  exporter.parse(
    scene,
    (result) => {
      const buffer = result instanceof ArrayBuffer ? Buffer.from(result) : Buffer.from(JSON.stringify(result))
      writeFileSync(join(outDir, fileName), buffer)
      console.log(`exported ${fileName}`)
    },
    (err) => console.error(`export failed ${fileName}`, err),
    { binary: true },
  )
}

function sofa() {
  const s = new THREE.Group()
  const fabric = mat('#b4552d', { roughness: 0.95 })
  const wood = mat('#4a3728', { roughness: 1 })

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.7), fabric)
  seat.position.y = 0.35
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.15), fabric)
  back.position.set(0, 0.72, -0.28)
  const cushionL = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.12, 0.6), fabric)
  cushionL.position.set(-0.44, 0.56, 0.02)
  const cushionR = cushionL.clone()
  cushionR.position.x = 0.44
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.7), fabric)
  armL.position.set(-0.83, 0.42, 0)
  const armR = armL.clone()
  armR.position.x = 0.83

  s.add(seat, back, cushionL, cushionR, armL, armR)
  for (const [x, z] of [[-0.8, -0.28], [0.8, -0.28], [-0.8, 0.28], [0.8, 0.28]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), wood)
    leg.position.set(x, 0.07, z)
    s.add(leg)
  }
  return s
}

function chair() {
  const g = new THREE.Group()
  const fabric = mat('#446688', { roughness: 0.9 })
  const wood = mat('#8B4513', { roughness: 1 })

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), wood)
  seat.position.y = 0.42
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.07), fabric)
  back.position.set(0, 0.75, -0.22)
  g.add(seat, back)
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8), wood)
    leg.position.set(x, 0.21, z)
    g.add(leg)
  }
  return g
}

function table() {
  const g = new THREE.Group()
  const wood = mat('#8B4513', { roughness: 0.85 })

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.8), wood)
  top.position.y = 0.75
  g.add(top)
  for (const [x, z] of [[-0.52, -0.34], [0.52, -0.34], [-0.52, 0.34], [0.52, 0.34]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.71, 0.06), wood)
    leg.position.set(x, 0.355, z)
    g.add(leg)
  }
  return g
}

function bookshelf() {
  const g = new THREE.Group()
  const wood = mat('#6b4f2f', { roughness: 0.9 })
  const dark = mat('#4a3520', { roughness: 0.9 })

  const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.8, 0.3), wood)
  side.position.set(-0.57, 0.9, 0)
  const sideR = side.clone()
  sideR.position.x = 0.57
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.03), dark)
  back.position.set(0, 0.9, -0.14)
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.3), wood)
  top.position.set(0, 1.77, 0)
  const bottom = top.clone()
  bottom.position.y = 0.03
  g.add(side, sideR, back, top, bottom)
  for (let i = 1; i <= 3; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.3), wood)
    shelf.position.set(0, 0.45 * i, 0)
    g.add(shelf)
  }
  return g
}

function bed() {
  const g = new THREE.Group()
  const frame = mat('#5a4632', { roughness: 0.9 })
  const mattress = mat('#d8d8dc', { roughness: 1 })

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.0), frame)
  base.position.y = 0.15
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.08), frame)
  headboard.position.set(0, 0.65, -0.96)
  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 1.95), mattress)
  pad.position.y = 0.39
  const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.35), mat('#e8e8ec', { roughness: 1 }))
  pillow1.position.set(-0.35, 0.53, -0.72)
  const pillow2 = pillow1.clone()
  pillow2.position.x = 0.35
  g.add(base, headboard, pad, pillow1, pillow2)
  return g
}

function lamp() {
  const g = new THREE.Group()
  const metal = mat('#c0c0c0', { roughness: 0.3, metalness: 0.9 })
  const shade = mat('#f5e6c8', { roughness: 0.8 })

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 16), metal)
  base.position.y = 0.02
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), metal)
  pole.position.y = 0.62
  const shadeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.24, 16, 1, true), shade)
  shadeMesh.position.y = 1.24
  g.add(base, pole, shadeMesh)
  return g
}

exportGlb(sofa(), 'sofa.glb')
exportGlb(chair(), 'chair.glb')
exportGlb(table(), 'table.glb')
exportGlb(bookshelf(), 'bookshelf.glb')
exportGlb(bed(), 'bed.glb')
exportGlb(lamp(), 'lamp.glb')

const manifest = [
  {
    FileName: 'sofa.glb',
    Name: 'Sofa',
    Category: 'Seating',
    Width: 1.9,
    Height: 1.0,
    Depth: 0.85,
    MaterialSlots: [
      { Name: 'Fabric', DefaultColor: '#b4552d' },
      { Name: 'Frame', DefaultColor: '#4a3728' },
    ],
  },
  {
    FileName: 'chair.glb',
    Name: 'Chair',
    Category: 'Seating',
    Width: 0.55,
    Height: 1.0,
    Depth: 0.55,
    MaterialSlots: [
      { Name: 'Fabric', DefaultColor: '#446688' },
      { Name: 'Frame', DefaultColor: '#8B4513' },
    ],
  },
  {
    FileName: 'table.glb',
    Name: 'Table',
    Category: 'Tables',
    Width: 1.2,
    Height: 0.8,
    Depth: 0.8,
    MaterialSlots: [{ Name: 'Wood', DefaultColor: '#8B4513' }],
  },
  {
    FileName: 'bookshelf.glb',
    Name: 'Bookshelf',
    Category: 'Storage',
    Width: 1.2,
    Height: 1.8,
    Depth: 0.3,
    MaterialSlots: [{ Name: 'Wood', DefaultColor: '#6b4f2f' }],
  },
  {
    FileName: 'bed.glb',
    Name: 'Bed',
    Category: 'Bedroom',
    Width: 1.6,
    Height: 1.1,
    Depth: 2.0,
    MaterialSlots: [
      { Name: 'Frame', DefaultColor: '#5a4632' },
      { Name: 'Mattress', DefaultColor: '#d8d8dc' },
    ],
  },
  {
    FileName: 'lamp.glb',
    Name: 'Floor Lamp',
    Category: 'Lighting',
    Width: 0.35,
    Height: 1.4,
    Depth: 0.35,
    MaterialSlots: [
      { Name: 'Metal', DefaultColor: '#c0c0c0' },
      { Name: 'Shade', DefaultColor: '#f5e6c8' },
    ],
  },
]
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('wrote manifest.json')
