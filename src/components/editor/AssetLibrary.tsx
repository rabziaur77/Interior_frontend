import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useEditorStore } from '../../stores/editorStore'
import type { Asset } from '../../engine/types'

export default function AssetLibrary() {
  const visible = useEditorStore((s) => s.assetLibraryVisible)
  const toggle = useEditorStore((s) => s.toggleAssetLibrary)
  const draggedAsset = useEditorStore((s) => s.draggedAsset)
  const setDraggedAsset = useEditorStore((s) => s.setDraggedAsset)

  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [category, setCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const t = setTimeout(async () => {
      try {
        const result = await api.assets.list(category ?? undefined, search.trim() || undefined)
        if (!cancelled) {
          setAssets(result)
          if (!category && !search.trim()) {
            setCategories([...new Set(result.map((a) => a.category))])
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load assets')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [category, search])

  const startPlacing = useCallback((asset: Asset) => {
    setDraggedAsset(asset)
  }, [setDraggedAsset])

  if (!visible) return null

  return (
    <div className="absolute right-2 top-2 bottom-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg flex flex-col overflow-hidden z-20">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
        <span className="text-sm font-semibold text-white">Asset Library</span>
        <button onClick={toggle} className="text-gray-400 hover:text-white text-sm">✕</button>
      </div>

      <div className="p-2 space-y-2 shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets..."
          className="w-full bg-gray-700 rounded px-2 py-1 text-sm text-white placeholder-gray-400"
        />
        {categories.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setCategory(null)}
              className={`text-xs rounded px-2 py-0.5 ${category === null ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c === category ? null : c)}
                className={`text-xs rounded px-2 py-0.5 ${category === c ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {error && <p className="text-red-400 text-xs">{error}</p>}
        {loading && <p className="text-gray-500 text-xs">Loading...</p>}
        {!loading && assets.length === 0 && <p className="text-gray-500 text-xs">No assets found.</p>}

        {assets.map((asset) => (
          <div
            key={asset.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', asset.id)
              startPlacing(asset)
            }}
            onClick={() => startPlacing(asset)}
            className={`cursor-grab rounded overflow-hidden border ${
              draggedAsset?.id === asset.id ? 'border-green-500 bg-gray-700' : 'border-gray-700 bg-gray-900 hover:bg-gray-700'
            }`}
            title={`${asset.name} (${asset.category}) — drag or click to place`}
          >
            <img
              src={api.assets.thumbnailUrl(asset.id)}
              alt={asset.name}
              draggable={false}
              className="w-full h-20 object-cover"
            />
            <div className="px-2 py-1">
              <p className="text-xs text-white truncate">{asset.name}</p>
              <p className="text-[10px] text-gray-500">
                {asset.width}×{asset.height}×{asset.depth} m
              </p>
            </div>
          </div>
        ))}
      </div>

      {draggedAsset && (
        <div className="px-3 py-2 border-t border-gray-700 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-green-400 truncate">Placing: {draggedAsset.name}</span>
            <button onClick={() => setDraggedAsset(null)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Click the ground to place it.</p>
        </div>
      )}
    </div>
  )
}
