import { useRef, useCallback, useState, useEffect } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Grid, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useSceneStore, generateId } from '../../stores/sceneStore'
import { useEditorStore, FURNITURE_ASSETS } from '../../stores/editorStore'
import { useSelectionStore } from '../../stores/selectionStore'
import { useHistoryStore } from '../../stores/historyStore'
import { useWallToolStore } from '../../stores/wallToolStore'
import { UpdateObjectCommand, AddObjectsCommand } from '../../engine/Command'
import { commitRoom } from '../../engine/wallUtils'
import { api } from '../../api/client'
import { registerExportTargets, unregisterExportTargets } from '../../engine/exportScene'
import type { SceneObject, WallCorner, Asset } from '../../engine/types'

const geometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 32, 32),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
}

function createFurnitureObject(assetId: string, x: number, z: number): SceneObject {
  const scaleMap: Record<string, [number, number, number]> = {
    sofa: [2, 0.5, 0.8],
    table: [1, 0.1, 0.6],
    chair: [0.5, 0.5, 0.5],
  }
  const asset = FURNITURE_ASSETS.find((a) => a.id === assetId)
  return {
    id: generateId(),
    type: 'furniture',
    position: [x, 0, z],
    rotation: [0, 0, 0],
    scale: scaleMap[assetId] ?? [0.5, 0.5, 0.5],
    properties: { assetType: assetId, color: asset?.color ?? '#cccccc' },
  }
}

function createAssetObject(asset: Asset, x: number, z: number): SceneObject {
  return {
    id: generateId(),
    type: 'furniture',
    position: [x, 0, z],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    properties: {
      assetId: asset.id,
      color: asset.materialSlots?.[0]?.defaultColor ?? '#cccccc',
      roughness: 0.7,
      metalness: 0,
      width: asset.width,
      height: asset.height,
      depth: asset.depth,
    },
  }
}

function GlbModel({ assetId, properties, opacity = 1 }: {
  assetId: string
  properties: Record<string, unknown>
  opacity?: number
}) {
  const [gltf, setGltf] = useState<THREE.Group | null>(null)
  const [error, setError] = useState(false)
  const [fit, setFit] = useState({ scale: 1, offsetY: 0 })

  const width = (properties.width as number) ?? 1
  const height = (properties.height as number) ?? 1
  const depth = (properties.depth as number) ?? 1

  useEffect(() => {
    let cancelled = false
    setGltf(null)
    setError(false)
    const loader = new GLTFLoader()
    loader.load(
      api.assets.fileUrl(assetId),
      (result) => {
        if (cancelled) return
        const box = new THREE.Box3().setFromObject(result.scene)
        const size = box.getSize(new THREE.Vector3())
        const sx = size.x > 0.001 ? width / size.x : 1
        const sy = size.y > 0.001 ? height / size.y : 1
        const sz = size.z > 0.001 ? depth / size.z : 1
        const scale = Math.min(sx, sy, sz)
        setFit({ scale, offsetY: -box.min.y * scale })
        setGltf(result.scene)
      },
      undefined,
      () => { if (!cancelled) setError(true) },
    )
    return () => { cancelled = true }
  }, [assetId, width, height, depth])

  useEffect(() => {
    if (!gltf) return
    gltf.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of materials) {
        const mat = m as THREE.MeshStandardMaterial
        mat.color.set((properties.color as string) ?? '#cccccc')
        mat.roughness = (properties.roughness as number) ?? 0.7
        mat.metalness = (properties.metalness as number) ?? 0
        mat.transparent = opacity < 1
        mat.opacity = opacity
        mat.needsUpdate = true
      }
    })
  }, [gltf, properties, opacity])

  if (error) return null
  if (!gltf) return null

  return (
    <group position={[0, fit.offsetY, 0]} scale={fit.scale}>
      <primitive object={gltf} />
    </group>
  )
}

function AssetDropLayer() {
  const draggedAsset = useEditorStore((s) => s.draggedAsset)
  const setDraggedAsset = useEditorStore((s) => s.setDraggedAsset)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const snapSize = useEditorStore((s) => s.snapSize)
  const executeCommand = useHistoryStore((s) => s.executeCommand)
  const [hover, setHover] = useState<[number, number, number] | null>(null)
  const snap = (v: number) => (snapEnabled ? Math.round(v / snapSize) * snapSize : v)

  const place = useCallback((x: number, z: number) => {
    if (!draggedAsset) return
    const obj = createAssetObject(draggedAsset, snap(x), snap(z))
    executeCommand(new AddObjectsCommand([obj]))
    setDraggedAsset(null)
    setHover(null)
  }, [draggedAsset, snap, executeCommand, setDraggedAsset])

  if (!draggedAsset) return null

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onPointerDown={(e) => { e.stopPropagation(); place(e.point.x, e.point.z) }}
        onPointerMove={(e) => { e.stopPropagation(); setHover([snap(e.point.x), 0, snap(e.point.z)]) }}
        onPointerOut={() => setHover(null)}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0.01} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {hover && (
        <group position={hover}>
          <GlbModel
            assetId={draggedAsset.id}
            properties={{
              color: draggedAsset.materialSlots?.[0]?.defaultColor ?? '#cccccc',
              width: draggedAsset.width,
              height: draggedAsset.height,
              depth: draggedAsset.depth,
            }}
            opacity={0.6}
          />
        </group>
      )}
    </>
  )
}

function WallSegment({ start, end, height, thickness, color, opacity = 1 }: {
  start: WallCorner; end: WallCorner; height: number; thickness: number; color: string; opacity?: number
}) {
  const dx = end.x - start.x
  const dz = end.z - start.z
  const length = Math.sqrt(dx * dx + dz * dz)
  if (length < 0.01) return null
  const angle = Math.atan2(dz, dx)
  return (
    <mesh position={[(start.x + end.x) / 2, height / 2, (start.z + end.z) / 2]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

function FloorMesh({ corners, color }: { corners: WallCorner[]; color: string }) {
  if (corners.length < 3) return null
  const shape = new THREE.Shape()
  shape.moveTo(corners[0].x, corners[0].z)
  for (let i = 1; i < corners.length; i++) {
    shape.lineTo(corners[i].x, corners[i].z)
  }
  shape.closePath()
  return (
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  )
}

function WallBuilder() {
  const corners = useWallToolStore((s) => s.corners)
  const previewPoint = useWallToolStore((s) => s.previewPoint)
  const addCorner = useWallToolStore((s) => s.addCorner)
  const removeLastCorner = useWallToolStore((s) => s.removeLastCorner)
  const setPreviewPoint = useWallToolStore((s) => s.setPreviewPoint)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const snapSize = useEditorStore((s) => s.snapSize)

  const snap = (v: number) => snapEnabled ? Math.round(v / snapSize) * snapSize : v

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    // Right-click removes last corner
    if (e.button === 2) {
      if (corners.length > 0) removeLastCorner()
      return
    }
    const x = snap(e.point.x)
    const z = snap(e.point.z)
    if (corners.length >= 2) {
      const first = corners[0]
      if (Math.abs(x - first.x) < 0.5 && Math.abs(z - first.z) < 0.5) {
        commitRoom()
        return
      }
    }
    addCorner({ x, z })
  }, [corners, snap, addCorner, removeLastCorner])

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (corners.length === 0) return
    setPreviewPoint({ x: snap(e.point.x), z: snap(e.point.z) })
  }, [corners.length, snap, setPreviewPoint])

  const handlePointerOut = useCallback(() => setPreviewPoint(null), [setPreviewPoint])

  const first = corners[0]
  const nearFirst = previewPoint && corners.length >= 2
    && Math.abs(previewPoint.x - first.x) < 0.5
    && Math.abs(previewPoint.z - first.z) < 0.5

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerOut={handlePointerOut} onContextMenu={(e) => e.nativeEvent.preventDefault()}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0.01} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {corners.map((c, i) => (
        <mesh key={`c-${i}`} position={[c.x, 0.05, c.z]}>
          <circleGeometry args={[0.12, 16]} />
          <meshBasicMaterial color={i === 0 ? '#00ff88' : '#ff8800'} />
        </mesh>
      ))}
      {corners.length > 1 && corners.slice(0, -1).map((c, i) => (
        <WallSegment key={`w-${i}`} start={c} end={corners[i + 1]} height={3} thickness={0.15} color="#cccccc" />
      ))}
      {corners.length > 0 && previewPoint && (
        <>
          <WallSegment start={corners[corners.length - 1]} end={previewPoint} height={3} thickness={0.15} color="#ff8800" opacity={0.5} />
          {nearFirst && (
            <WallSegment start={previewPoint} end={first} height={3} thickness={0.15} color="#00ff88" opacity={0.6} />
          )}
        </>
      )}
    </>
  )
}

function FurniturePlacer() {
  const placingFurniture = useEditorStore((s) => s.placingFurniture)
  const setPlacingFurniture = useEditorStore((s) => s.setPlacingFurniture)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const snapSize = useEditorStore((s) => s.snapSize)
  const executeCommand = useHistoryStore((s) => s.executeCommand)
  const snap = (v: number) => snapEnabled ? Math.round(v / snapSize) * snapSize : v
  const [hoverPos, setHoverPos] = useState<[number, number, number] | null>(null)

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!placingFurniture) return
    e.stopPropagation()
    const x = snap(e.point.x)
    const z = snap(e.point.z)
    const obj = createFurnitureObject(placingFurniture.id, x, z)
    executeCommand(new AddObjectsCommand([obj]))
    setPlacingFurniture(null)
  }, [placingFurniture, snap, executeCommand, setPlacingFurniture])

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!placingFurniture) return
    setHoverPos([snap(e.point.x), 0, snap(e.point.z)])
  }, [placingFurniture, snap])

  const handlePointerOut = useCallback(() => setHoverPos(null), [])

  if (!placingFurniture) return null

  const asset = FURNITURE_ASSETS.find((a) => a.id === placingFurniture.id)
  const geom = geometries[asset?.geometry ?? 'box']
  const scaleMap: Record<string, [number, number, number]> = { sofa: [2, 0.5, 0.8], table: [1, 0.1, 0.6], chair: [0.5, 0.5, 0.5] }
  const s = scaleMap[placingFurniture.id] ?? [0.5, 0.5, 0.5]

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerOut={handlePointerOut}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0.01} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {hoverPos && (
        <mesh position={hoverPos} scale={s}>
          <primitive object={geom} attach="geometry" />
          <meshStandardMaterial color={placingFurniture.color} transparent opacity={0.6} />
        </mesh>
      )}
    </>
  )
}

function ObjectMesh({ object, isSelected, onRef }: { object: SceneObject; isSelected: boolean; onRef?: (obj: THREE.Object3D) => void }) {
  const select = useSelectionStore((s) => s.select)
  const activeTool = useEditorStore((s) => s.activeTool)

  const handlePointerDown = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (activeTool === 'select') {
      select(object.id)
    }
  }, [activeTool, select, object.id])

  if (object.type === 'wall') {
    const p = object.properties as { start?: WallCorner; end?: WallCorner; height?: number; thickness?: number; color?: string }
    if (!p.start || !p.end) return null
    return (
      <group userData={{ exportable: true }} onPointerDown={handlePointerDown} onDoubleClick={() => select(object.id)}>
        <WallSegment start={p.start} end={p.end} height={p.height ?? 3} thickness={p.thickness ?? 0.15} color={(p.color as string) ?? '#cccccc'} />
      </group>
    )
  }

  if (object.type === 'floor') {
    const p = object.properties as { corners?: WallCorner[]; color?: string }
    if (!p.corners) return null
    return (
      <group userData={{ exportable: true }} onPointerDown={handlePointerDown} onDoubleClick={() => select(object.id)}>
        <FloorMesh corners={p.corners} color={(p.color as string) ?? '#e0e0e0'} />
      </group>
    )
  }

  if (object.type === 'furniture') {
    const p = object.properties as { assetId?: string; color?: string; roughness?: number; metalness?: number }
    if (p.assetId) {
      return (
        <group
          ref={(el) => { if (el && onRef) onRef(el) }}
          userData={{ exportable: true }}
          position={object.position}
          rotation={object.rotation}
          scale={object.scale}
          onPointerDown={handlePointerDown}
          onDoubleClick={() => select(object.id)}
        >
          <GlbModel assetId={p.assetId} properties={object.properties} />
        </group>
      )
    }
    return (
      <mesh
        ref={(el) => { if (el && onRef) onRef(el) }}
        userData={{ exportable: true }}
        position={object.position}
        rotation={object.rotation}
        scale={object.scale}
        onPointerDown={handlePointerDown}
        onDoubleClick={() => select(object.id)}
      >
        <primitive object={geometries.box} attach="geometry" />
        <meshStandardMaterial
          color={(p.color as string) ?? '#cccccc'}
          roughness={p.roughness ?? 0.7}
          metalness={p.metalness ?? 0}
          emissive={isSelected ? '#4488ff' : '#000000'}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>
    )
  }

  return (
    <mesh
      ref={(el) => { if (el && onRef) onRef(el) }}
      userData={{ exportable: true }}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => select(object.id)}
    >
      <primitive object={geometries[object.type as keyof typeof geometries] ?? geometries.box} attach="geometry" />
      <meshStandardMaterial
        color={(object.properties.color as string) ?? '#cccccc'}
        roughness={(object.properties.roughness as number) ?? 0.7}
        metalness={(object.properties.metalness as number) ?? 0}
        emissive={isSelected ? '#4488ff' : '#000000'}
        emissiveIntensity={isSelected ? 0.15 : 0}
      />
    </mesh>
  )
}

function ViewportContent() {
  const meshRefs = useRef<Map<string, THREE.Object3D>>(new Map())
  const objects = useSceneStore((s) => s.objects)
  const selectedIds = useSelectionStore((s) => s.ids)
  const activeTool = useEditorStore((s) => s.activeTool)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const snapSize = useEditorStore((s) => s.snapSize)
  const showGrid = useEditorStore((s) => s.showGrid)
  const placingFurniture = useEditorStore((s) => s.placingFurniture)
  const executeCommand = useHistoryStore((s) => s.executeCommand)
  const dragStartRef = useRef<Partial<SceneObject> | null>(null)

  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    registerExportTargets(gl, scene, camera)
    return () => unregisterExportTargets()
  }, [gl, scene, camera])

  const selectedId = selectedIds[0] ?? null
  const selectedObj = selectedId ? objects.find((o) => o.id === selectedId) ?? null : null
  const selectedMesh = selectedId ? meshRefs.current.get(selectedId) ?? null : null

  const handleRef = useCallback((id: string) => (obj: THREE.Object3D) => {
    meshRefs.current.set(id, obj)
  }, [])

  const gizmoMode = activeTool === 'move' ? 'translate' : activeTool === 'rotate' ? 'rotate' : 'scale'
  const showGizmo = (activeTool === 'move' || activeTool === 'rotate' || activeTool === 'scale') && selectedMesh && selectedId && selectedObj?.type !== 'wall' && selectedObj?.type !== 'floor'

  const handleGizmoPointerDown = useCallback(() => {
    if (!selectedMesh) return
    dragStartRef.current = {
      position: [selectedMesh.position.x, selectedMesh.position.y, selectedMesh.position.z] as [number, number, number],
      rotation: [selectedMesh.rotation.x, selectedMesh.rotation.y, selectedMesh.rotation.z] as [number, number, number],
      scale: [selectedMesh.scale.x, selectedMesh.scale.y, selectedMesh.scale.z] as [number, number, number],
    }
  }, [selectedMesh])

  const handleGizmoPointerUp = useCallback(() => {
    const start = dragStartRef.current
    if (!start || !selectedMesh || !selectedId) return
    const current = {
      position: [selectedMesh.position.x, selectedMesh.position.y, selectedMesh.position.z] as [number, number, number],
      rotation: [selectedMesh.rotation.x, selectedMesh.rotation.y, selectedMesh.rotation.z] as [number, number, number],
      scale: [selectedMesh.scale.x, selectedMesh.scale.y, selectedMesh.scale.z] as [number, number, number],
    }
    const hasChanged =
      current.position.some((v, i) => v !== start.position![i]) ||
      current.rotation.some((v, i) => v !== start.rotation![i]) ||
      current.scale.some((v, i) => v !== start.scale![i])
    if (hasChanged) {
      executeCommand(new UpdateObjectCommand(selectedId, current, start))
    }
    dragStartRef.current = null
  }, [selectedMesh, selectedId, executeCommand])

  const draggingAsset = useEditorStore((s) => s.draggedAsset)
  const showOrbit = activeTool === 'select' && !placingFurniture && !draggingAsset
  const buildingWall = activeTool === 'wall'

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[-10, 5, -10]} intensity={0.3} />

      {showGrid && <Grid args={[20, 20]} cellSize={1} cellThickness={0.6} cellColor="#6b7280" sectionSize={5} sectionThickness={1} sectionColor="#9ca3af" />}

      {showOrbit && <OrbitControls makeDefault />}

      {showGizmo && (
        <TransformControls
          object={selectedMesh}
          mode={gizmoMode}
          translationSnap={snapEnabled ? snapSize : undefined}
          rotationSnap={snapEnabled ? THREE.MathUtils.degToRad(15) : undefined}
          scaleSnap={snapEnabled ? 0.1 : undefined}
          onPointerDown={handleGizmoPointerDown}
          onPointerUp={handleGizmoPointerUp}
        />
      )}

      {buildingWall && <WallBuilder />}
      {placingFurniture && <FurniturePlacer />}
      <AssetDropLayer />

      {objects.map((obj) =>
        obj.type === 'wall' || obj.type === 'floor' ? (
          <ObjectMesh key={obj.id} object={obj} isSelected={selectedIds.includes(obj.id)} />
        ) : (
          <ObjectMesh key={obj.id} object={obj} isSelected={selectedIds.includes(obj.id)} onRef={handleRef(obj.id)} />
        ),
      )}
    </>
  )
}

export default function Viewport() {
  return (
    <div className="flex-1 relative min-h-0 overflow-hidden">
      <Canvas camera={{ position: [8, 8, 8], fov: 50 }} gl={{ preserveDrawingBuffer: true }} onPointerMissed={() => useSelectionStore.getState().select(null)}>
        <ViewportContent />
      </Canvas>
    </div>
  )
}

function StaticObjectMesh({ object }: { object: SceneObject }) {
  if (object.type === 'wall') {
    const p = object.properties as { start?: WallCorner; end?: WallCorner; height?: number; thickness?: number; color?: string }
    if (!p.start || !p.end) return null
    return <WallSegment start={p.start} end={p.end} height={p.height ?? 3} thickness={p.thickness ?? 0.15} color={(p.color as string) ?? '#cccccc'} />
  }

  if (object.type === 'floor') {
    const p = object.properties as { corners?: WallCorner[]; color?: string }
    if (!p.corners) return null
    return <FloorMesh corners={p.corners} color={(p.color as string) ?? '#e0e0e0'} />
  }

  if (object.type === 'furniture') {
    const p = object.properties as { assetId?: string; color?: string; roughness?: number; metalness?: number }
    if (p.assetId) {
      return (
        <group position={object.position} rotation={object.rotation} scale={object.scale}>
          <GlbModel assetId={p.assetId} properties={object.properties} />
        </group>
      )
    }
    return (
      <mesh position={object.position} rotation={object.rotation} scale={object.scale}>
        <primitive object={geometries.box} attach="geometry" />
        <meshStandardMaterial
          color={(p.color as string) ?? '#cccccc'}
          roughness={p.roughness ?? 0.7}
          metalness={p.metalness ?? 0}
        />
      </mesh>
    )
  }

  return (
    <mesh position={object.position} rotation={object.rotation} scale={object.scale}>
      <primitive object={geometries[object.type as keyof typeof geometries] ?? geometries.box} attach="geometry" />
      <meshStandardMaterial
        color={(object.properties.color as string) ?? '#cccccc'}
        roughness={(object.properties.roughness as number) ?? 0.7}
        metalness={(object.properties.metalness as number) ?? 0}
      />
    </mesh>
  )
}

export function SharedSceneView({ objects }: { objects: SceneObject[] }) {
  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-10, 5, -10]} intensity={0.3} />
        <Grid args={[20, 20]} cellSize={1} cellThickness={0.6} cellColor="#6b7280" sectionSize={5} sectionThickness={1} sectionColor="#9ca3af" />
        <OrbitControls makeDefault />
        {objects.map((obj) => <StaticObjectMesh key={obj.id} object={obj} />)}
      </Canvas>
    </div>
  )
}
