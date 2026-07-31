import { useCallback, useEffect, useState } from 'react'
import { useEditorStore, FURNITURE_ASSETS } from '../../stores/editorStore'
import { useHistoryStore } from '../../stores/historyStore'
import { useWallToolStore } from '../../stores/wallToolStore'
import { useSceneStore } from '../../stores/sceneStore'
import { useProjectStore } from '../../stores/projectStore'
import { commitRoom } from '../../engine/wallUtils'
import { exportSceneAsPng, exportSceneAsGlb } from '../../engine/exportScene'
import type { Tool } from '../../engine/types'

const tools: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '⤓' },
  { id: 'move', label: 'Move', icon: '✚' },
  { id: 'rotate', label: 'Rotate', icon: '⟳' },
  { id: 'scale', label: 'Scale', icon: '⬌' },
  { id: 'wall', label: 'Wall', icon: '🧱' },
]

export default function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)
  const showGrid = useEditorStore((s) => s.showGrid)
  const toggleGrid = useEditorStore((s) => s.toggleGrid)
  const placingFurniture = useEditorStore((s) => s.placingFurniture)
  const setPlacingFurniture = useEditorStore((s) => s.setPlacingFurniture)
  const assetLibraryVisible = useEditorStore((s) => s.assetLibraryVisible)
  const toggleAssetLibrary = useEditorStore((s) => s.toggleAssetLibrary)
  const setDraggedAsset = useEditorStore((s) => s.setDraggedAsset)
  const shareVisible = useEditorStore((s) => s.shareVisible)
  const toggleShare = useEditorStore((s) => s.toggleShare)
  const objects = useSceneStore((s) => s.objects)
  const projectName = useProjectStore((s) => s.name)
  const [exporting, setExporting] = useState(false)

  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)
  const past = useHistoryStore((s) => s.past)
  const future = useHistoryStore((s) => s.future)

  const wallCorners = useWallToolStore((s) => s.corners)
  const clearWall = useWallToolStore((s) => s.clear)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) { redo(); return }
        undo(); return
      }
      if (e.key === 'Enter' && activeTool === 'wall' && wallCorners.length >= 2) {
        commitRoom()
        return
      }
      if (e.key === 'Escape') {
        if (wallCorners.length > 0) { clearWall(); return }
        if (placingFurniture) { setPlacingFurniture(null); return }
        if (activeTool !== 'select') { setActiveTool('select') }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [undo, redo, wallCorners.length, clearWall, placingFurniture, setPlacingFurniture, activeTool, setActiveTool])

  const switchTool = useCallback((tool: Tool) => {
    if (activeTool === 'wall' && tool !== 'wall') clearWall()
    if (tool === 'wall') clearWall()
    setPlacingFurniture(null)
    setActiveTool(tool)
  }, [activeTool, clearWall, setActiveTool, setPlacingFurniture])

  const handleWallClick = useCallback(() => {
    setPlacingFurniture(null)
    if (activeTool === 'wall') {
      setActiveTool('select')
    } else {
      clearWall()
      setActiveTool('wall')
    }
  }, [activeTool, setActiveTool, setPlacingFurniture, clearWall])

  const handleFurnitureClick = useCallback((assetId: string) => {
    if (activeTool === 'wall') clearWall()
    if (placingFurniture?.id === assetId) {
      setPlacingFurniture(null)
    } else {
      const asset = FURNITURE_ASSETS.find((a) => a.id === assetId)
      if (asset) setPlacingFurniture(asset)
    }
  }, [activeTool, clearWall, placingFurniture, setPlacingFurniture])

  const filenameBase = projectName.trim().replace(/[^\w\-]+/g, '-').toLowerCase() || 'scene'

  const handlePngExport = useCallback(async () => {
    setExporting(true)
    try {
      exportSceneAsPng(`${filenameBase}.png`)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }, [filenameBase])

  const handleGlbExport = useCallback(async () => {
    setExporting(true)
    try {
      await exportSceneAsGlb(`${filenameBase}.glb`)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }, [filenameBase])

  const handleShareClick = useCallback(() => {
    if (shareVisible) {
      toggleShare()
    } else {
      setActiveTool('select')
      if (assetLibraryVisible) {
        toggleAssetLibrary()
        setDraggedAsset(null)
      }
      toggleShare()
    }
  }, [shareVisible, toggleShare, setActiveTool, assetLibraryVisible, toggleAssetLibrary, setDraggedAsset])

  return (
    <div className="h-10 bg-gray-800 text-white flex items-center gap-1 px-2 shrink-0">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={tool.id === 'wall' ? handleWallClick : () => switchTool(tool.id)}
          className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
            activeTool === tool.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          title={tool.label}
        >
          <span>{tool.icon}</span>
          <span className="hidden sm:inline">{tool.label}</span>
        </button>
      ))}

      {activeTool === 'wall' && wallCorners.length > 0 && (
        <>
          <div className="w-px h-5 bg-gray-600 mx-2" />
          <button
            onClick={() => { clearWall(); setActiveTool('select') }}
            className="px-2 py-1 rounded text-sm text-gray-300 hover:bg-gray-700"
            title="Cancel (Escape)"
          >✕ Cancel</button>
          <button
            onClick={commitRoom}
            disabled={wallCorners.length < 2}
            className="px-2 py-1 rounded text-sm bg-green-700 text-white hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Finish room (Enter)"
          >✓ Complete</button>
        </>
      )}

      {activeTool === 'wall' && wallCorners.length === 0 && (
        <span className="text-xs text-gray-400 ml-2">Click on ground to place corners. Right-click to undo.</span>
      )}

      <div className="w-px h-5 bg-gray-600 mx-2" />

      <button
        onClick={undo}
        disabled={past.length === 0}
        className="px-2 py-1 rounded text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        ↩ Undo
      </button>
      <button
        onClick={redo}
        disabled={future.length === 0}
        className="px-2 py-1 rounded text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
      >
        ↪ Redo
      </button>

      <div className="w-px h-5 bg-gray-600 mx-2" />

      {FURNITURE_ASSETS.map((asset) => (
        <button
          key={asset.id}
          onClick={() => handleFurnitureClick(asset.id)}
          className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
            placingFurniture?.id === asset.id ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          title={`Place ${asset.label}`}
        >
          <span>{asset.icon}</span>
          <span className="hidden sm:inline">{asset.label}</span>
        </button>
      ))}

      <div className="w-px h-5 bg-gray-600 mx-2" />

      <button
        onClick={() => setSnapEnabled(!snapEnabled)}
        className={`px-2 py-1 rounded text-sm ${snapEnabled ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-700'}`}
        title="Toggle Snap"
      >
        Snap {snapEnabled ? 'ON' : 'OFF'}
      </button>
      <button
        onClick={toggleGrid}
        className={`px-2 py-1 rounded text-sm ${showGrid ? 'bg-blue-600' : 'text-gray-300 hover:bg-gray-700'}`}
        title="Toggle Grid"
      >
        Grid
      </button>

      <div className="w-px h-5 bg-gray-600 mx-2" />

      <button
        onClick={() => void handlePngExport()}
        disabled={objects.length === 0 || exporting}
        className="px-2 py-1 rounded text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Export PNG screenshot"
      >
        <span>📷</span>
        <span className="hidden sm:inline">PNG</span>
      </button>
      <button
        onClick={() => void handleGlbExport()}
        disabled={objects.length === 0 || exporting}
        className="px-2 py-1 rounded text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Export GLB model"
      >
        <span>🧊</span>
        <span className="hidden sm:inline">GLB</span>
      </button>

      <div className="w-px h-5 bg-gray-600 mx-2" />

      <button
        onClick={handleShareClick}
        className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${shareVisible ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        title="Share scene"
      >
        <span>🔗</span>
        <span className="hidden sm:inline">Share</span>
      </button>

      <button
        onClick={() => {
          if (assetLibraryVisible) {
            toggleAssetLibrary()
            setDraggedAsset(null)
          } else {
            setActiveTool('select')
            toggleAssetLibrary()
          }
        }}
        className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${assetLibraryVisible ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        title="Asset Library"
      >
        <span>📦</span>
        <span className="hidden sm:inline">Assets</span>
      </button>
    </div>
  )
}
