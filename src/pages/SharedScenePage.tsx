import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { deserializeScene } from '../engine/sceneCodec'
import { SharedSceneView } from '../components/editor/Viewport'
import type { SceneObject } from '../engine/types'

export default function SharedScenePage() {
  const { token } = useParams<{ token: string }>()
  const [name, setName] = useState('')
  const [objects, setObjects] = useState<SceneObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!token) return
    setLoading(true)
    setError('')
    api.share.get(token)
      .then((scene) => {
        if (cancelled) return
        setName(scene.name)
        setObjects(scene.sceneData ? deserializeScene(scene.sceneData) : [])
      })
      .catch(() => {
        if (!cancelled) setError('This link is invalid or has been revoked.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="h-12 bg-gray-900 text-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold truncate">{name || 'Shared scene'}</span>
          <span className="text-xs text-gray-500 shrink-0">View-only</span>
        </div>
        <Link to="/login" className="text-sm text-gray-400 hover:text-white shrink-0">Sign in to edit</Link>
      </header>
      <main className="flex-1 min-h-0 bg-gray-100">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-gray-500">Loading scene...</div>
        ) : error ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-gray-600">
            <span className="text-lg">{error}</span>
            <Link to="/login" className="text-sm text-blue-600 hover:underline">Go to dashboard</Link>
          </div>
        ) : objects.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-gray-500">This scene is empty.</div>
        ) : (
          <SharedSceneView objects={objects} />
        )}
      </main>
    </div>
  )
}
