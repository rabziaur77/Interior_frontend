import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { useProjectStore } from '../stores/projectStore'
import { useSceneStore } from '../stores/sceneStore'
import { useHistoryStore } from '../stores/historyStore'
import { useSelectionStore } from '../stores/selectionStore'
import { useWallToolStore } from '../stores/wallToolStore'
import { serializeScene, deserializeScene } from '../engine/sceneCodec'
import { getDraft, saveDraft, clearDraft } from '../engine/drafts'
import Editor from '../components/editor/Editor'

const AUTOSAVE_DEBOUNCE_MS = 2500

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const name = useProjectStore((s) => s.name)
  const setName = useProjectStore((s) => s.setName)
  const dirty = useProjectStore((s) => s.dirty)
  const saving = useProjectStore((s) => s.saving)
  const revision = useProjectStore((s) => s.revision)

  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [recovery, setRecovery] = useState<{ sceneData: string } | null>(null)
  const hydratingRef = useRef(false)

  const loadProject = useCallback(async (id: string) => {
    hydratingRef.current = true
    useProjectStore.getState().clear()
    useHistoryStore.getState().clear()
    useSelectionStore.getState().clear()
    useWallToolStore.getState().clear()
    useSceneStore.getState().clear()
    setLoadError('')
    setSaveError('')
    setRecovery(null)
    try {
      const project = await api.projects.get(id)
      const objects = project.sceneData ? deserializeScene(project.sceneData) : []
      useSceneStore.getState().loadObjects(objects)
      useProjectStore.getState().setProject(id, project.name, project.version, project.shareToken)

      const draft = getDraft(id)
      if (draft && new Date(draft.savedAt) > new Date(project.updatedAt)) {
        setRecovery({ sceneData: draft.sceneData })
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      hydratingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (projectId) loadProject(projectId)
  }, [projectId, loadProject])

  useEffect(() => {
    const unsubscribe = useSceneStore.subscribe((state, prev) => {
      if (state.objects !== prev.objects && !hydratingRef.current) {
        useProjectStore.getState().markDirty()
      }
    })
    return unsubscribe
  }, [])

  const saveNow = useCallback(async () => {
    const { id, name: currentName, version, saving: isSaving, dirty: isDirty } = useProjectStore.getState()
    if (!id || isSaving || !isDirty) return

    useProjectStore.getState().setSaving(true)
    setSaveError('')
    const sceneData = serializeScene(useSceneStore.getState().objects)
    saveDraft(id, { sceneData, savedAt: new Date().toISOString() })

    try {
      const updated = await api.projects.update(id, { name: currentName, sceneData, version })
      useProjectStore.getState().markSaved(updated.version)
      clearDraft(id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save project'
      setSaveError(message.includes('modified') ? 'Project was modified elsewhere. Reload from server.' : message)
    } finally {
      useProjectStore.getState().setSaving(false)
    }
  }, [])

  useEffect(() => {
    if (revision === 0) return
    const timer = setTimeout(() => { void saveNow() }, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [revision, saveNow])

  const restoreDraft = useCallback(() => {
    if (!projectId || !recovery) return
    hydratingRef.current = true
    try {
      useSceneStore.getState().loadObjects(deserializeScene(recovery.sceneData))
    } finally {
      hydratingRef.current = false
    }
    setRecovery(null)
    useProjectStore.getState().markDirty()
  }, [projectId, recovery])

  const discardDraft = useCallback(() => {
    if (projectId) clearDraft(projectId)
    setRecovery(null)
  }, [projectId])

  const status = saving ? 'Saving...' : dirty ? 'Unsaved changes' : 'Saved'

  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="h-12 bg-gray-900 text-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-sm text-gray-400 hover:text-white shrink-0">← Projects</Link>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Project"
            className="bg-gray-800 rounded px-2 py-1 text-sm w-56"
          />
          <span className={`text-xs shrink-0 ${dirty ? 'text-yellow-400' : 'text-gray-500'}`}>{status}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {loadError && <span className="text-red-400 text-xs">{loadError}</span>}
          {saveError && <span className="text-red-400 text-xs max-w-60 truncate">{saveError}</span>}
          <button
            onClick={() => void saveNow()}
            disabled={!dirty || saving}
            className="text-sm bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
          <span className="text-sm text-gray-300 hidden sm:inline">{user?.displayName}</span>
          <button onClick={clearAuth} className="text-sm text-gray-400 hover:text-white">Logout</button>
        </div>
      </header>

      {recovery && (
        <div className="h-12 bg-amber-900 text-amber-100 flex items-center justify-between px-4 text-sm">
          <span>A local draft from an earlier session is newer than the saved version.</span>
          <div className="flex gap-2">
            <button onClick={restoreDraft} className="bg-amber-600 hover:bg-amber-500 rounded px-3 py-1">Restore draft</button>
            <button onClick={discardDraft} className="hover:bg-amber-800 rounded px-3 py-1">Discard</button>
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0">
        <Editor />
      </main>
    </div>
  )
}
