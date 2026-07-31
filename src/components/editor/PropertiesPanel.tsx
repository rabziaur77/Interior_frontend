import { useCallback, useEffect, useState } from 'react'
import { useSceneStore } from '../../stores/sceneStore'
import { useSelectionStore } from '../../stores/selectionStore'
import { useHistoryStore } from '../../stores/historyStore'
import { UpdateObjectCommand } from '../../engine/Command'
import type { SceneObject } from '../../engine/types'

function CoordField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-xs">
      <span className="w-3 text-gray-500 font-mono">{label}</span>
      <input
        type="number"
        step={0.1}
        value={Number(value.toFixed(3))}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-gray-700 rounded px-1 py-0.5 text-white font-mono text-xs"
      />
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-gray-400">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
      />
      <span className="font-mono text-gray-400 text-[10px]">{value}</span>
    </label>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-1">{title}</div>
}

const MATERIAL_PRESETS = [
  { label: 'Wood', color: '#8B5A2B', roughness: 0.9, metalness: 0 },
  { label: 'Fabric', color: '#7a7a8c', roughness: 1, metalness: 0 },
  { label: 'Metal', color: '#c0c0c0', roughness: 0.3, metalness: 0.9 },
  { label: 'Glossy', color: '#336699', roughness: 0.15, metalness: 0.2 },
  { label: 'Matte', color: '#888888', roughness: 1, metalness: 0 },
]

interface PanelState {
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  wallHeight: number
  wallThickness: number
  roughness: number
  metalness: number
}

function extractState(obj: SceneObject): PanelState {
  const p = obj.properties
  return {
    color: (p.color as string) ?? '#cccccc',
    position: [...obj.position],
    rotation: [...obj.rotation],
    scale: [...obj.scale],
    wallHeight: (p.height as number) ?? 3,
    wallThickness: (p.thickness as number) ?? 0.15,
    roughness: (p.roughness as number) ?? 0.7,
    metalness: (p.metalness as number) ?? 0,
  }
}

export default function PropertiesPanel() {
  const selectedIds = useSelectionStore((s) => s.ids)
  const selectedId = selectedIds[0] ?? null
  const objects = useSceneStore((s) => s.objects)
  const executeCommand = useHistoryStore((s) => s.executeCommand)

  const obj = selectedId ? objects.find((o) => o.id === selectedId) ?? null : null

  const [local, setLocal] = useState<PanelState | null>(null)

  useEffect(() => {
    if (obj) {
      setLocal(extractState(obj))
    } else {
      setLocal(null)
    }
  }, [obj?.id])

  const commit = useCallback((newState: PanelState) => {
    if (!obj || !selectedId) return
    const prev = extractState(obj)
    const snapshot: Partial<SceneObject> = {
      position: newState.position,
      rotation: newState.rotation,
      scale: obj.type === 'wall' ? [newState.position[0], newState.wallHeight, newState.position[2]] : newState.scale,
      properties: {
        ...obj.properties,
        color: newState.color,
        roughness: newState.roughness,
        metalness: newState.metalness,
      },
    }
    if (obj.type === 'wall') {
      snapshot.properties = { ...obj.properties, color: newState.color, height: newState.wallHeight, thickness: newState.wallThickness }
      snapshot.scale = [0, newState.wallHeight, newState.wallThickness]
    }
    executeCommand(new UpdateObjectCommand(selectedId, snapshot, prev))
  }, [obj, selectedId, executeCommand])

  if (!obj || !local) return null

  const setField = (key: keyof PanelState, value: number | string | [number, number, number]) => {
    const next = { ...local }
    if (key === 'position' || key === 'rotation' || key === 'scale') {
      next[key] = value as [number, number, number]
    } else if (key === 'color') {
      next[key] = value as string
    } else {
      next[key] = value as number
    }
    setLocal(next)
    commit(next)
  }

  const applyPreset = (preset: (typeof MATERIAL_PRESETS)[number]) => {
    const next = { ...local, color: preset.color, roughness: preset.roughness, metalness: preset.metalness }
    setLocal(next)
    commit(next)
  }

  return (
    <div className="w-60 bg-gray-800 border-l border-gray-700 overflow-y-auto p-3 text-white text-sm">
      <SectionHeader title={obj.type} />

      <ColorField label="Color" value={local.color} onChange={(v) => setField('color', v)} />

      <SectionHeader title="Material" />
      <div className="flex gap-1 flex-wrap">
        {MATERIAL_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(preset)}
            className="px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600"
            title={`${preset.label} (roughness ${preset.roughness}, metalness ${preset.metalness})`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        <label className="flex items-center gap-1 text-xs">
          <span className="text-gray-400">R</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={Number(local.roughness.toFixed(2))}
            onChange={(e) => setField('roughness', parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </label>
        <label className="flex items-center gap-1 text-xs">
          <span className="text-gray-400">M</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={Number(local.metalness.toFixed(2))}
            onChange={(e) => setField('metalness', parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </label>
      </div>

      <SectionHeader title="Position" />
      <div className="flex gap-1">
        <CoordField label="X" value={local.position[0]} onChange={(v) => setField('position', [v, local.position[1], local.position[2]])} />
        <CoordField label="Y" value={local.position[1]} onChange={(v) => setField('position', [local.position[0], v, local.position[2]])} />
        <CoordField label="Z" value={local.position[2]} onChange={(v) => setField('position', [local.position[0], local.position[1], v])} />
      </div>

      <SectionHeader title="Rotation" />
      <div className="flex gap-1">
        <CoordField label="X" value={local.rotation[0]} onChange={(v) => setField('rotation', [v, local.rotation[1], local.rotation[2]])} />
        <CoordField label="Y" value={local.rotation[1]} onChange={(v) => setField('rotation', [local.rotation[0], v, local.rotation[2]])} />
        <CoordField label="Z" value={local.rotation[2]} onChange={(v) => setField('rotation', [local.rotation[0], local.rotation[1], v])} />
      </div>

      <SectionHeader title="Scale" />
      <div className="flex gap-1">
        <CoordField label="X" value={local.scale[0]} onChange={(v) => setField('scale', [v, local.scale[1], local.scale[2]])} />
        <CoordField label="Y" value={local.scale[1]} onChange={(v) => setField('scale', [local.scale[0], v, local.scale[2]])} />
        <CoordField label="Z" value={local.scale[2]} onChange={(v) => setField('scale', [local.scale[0], local.scale[1], v])} />
      </div>

      {obj.type === 'wall' && (
        <>
          <SectionHeader title="Wall" />
          <div className="flex gap-1">
            <label className="flex items-center gap-1 text-xs">
              <span className="text-gray-400">H</span>
              <input
                type="number"
                step={0.1}
                value={Number(local.wallHeight.toFixed(3))}
                onChange={(e) => setField('wallHeight', parseFloat(e.target.value) || 0.1)}
                className="w-full bg-gray-700 rounded px-1 py-0.5 text-white font-mono text-xs"
              />
            </label>
            <label className="flex items-center gap-1 text-xs">
              <span className="text-gray-400">T</span>
              <input
                type="number"
                step={0.01}
                value={Number(local.wallThickness.toFixed(3))}
                onChange={(e) => setField('wallThickness', parseFloat(e.target.value) || 0.05)}
                className="w-full bg-gray-700 rounded px-1 py-0.5 text-white font-mono text-xs"
              />
            </label>
          </div>
        </>
      )}

      <div className="mt-4 text-[10px] text-gray-500">ID: {obj.id.slice(0, 8)}...</div>
    </div>
  )
}
