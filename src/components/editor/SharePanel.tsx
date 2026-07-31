import { useState } from 'react'
import { api } from '../../api/client'
import { useEditorStore } from '../../stores/editorStore'
import { useProjectStore } from '../../stores/projectStore'

export default function SharePanel() {
  const visible = useEditorStore((s) => s.shareVisible)
  const toggle = useEditorStore((s) => s.toggleShare)
  const projectId = useProjectStore((s) => s.id)
  const shareToken = useProjectStore((s) => s.shareToken)
  const setShareToken = useProjectStore((s) => s.setShareToken)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  if (!visible) return null

  const link = shareToken ? `${window.location.origin}/share/${shareToken}` : ''

  const createLink = async () => {
    if (!projectId) return
    setBusy(true)
    setError('')
    try {
      const res = await api.projects.share(projectId)
      setShareToken(res.shareToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link')
    } finally {
      setBusy(false)
    }
  }

  const revokeLink = async () => {
    if (!projectId) return
    setBusy(true)
    setError('')
    try {
      await api.projects.unshare(projectId)
      setShareToken(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke share link')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  return (
    <div className="absolute right-2 top-2 bottom-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-lg flex flex-col overflow-hidden z-20">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
        <span className="text-sm font-semibold text-white">Share</span>
        <button onClick={toggle} className="text-gray-400 hover:text-white text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-white text-sm">
        {error && <p className="text-red-400 text-xs">{error}</p>}

        {!shareToken ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              Anyone with the link can view this scene. You can revoke it at any time.
            </p>
            <button
              onClick={() => void createLink()}
              disabled={busy}
              className="w-full bg-blue-600 hover:bg-blue-500 rounded px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Creating...' : 'Create share link'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">View-only link:</p>
            <div className="flex gap-1">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 bg-gray-700 rounded px-2 py-1 text-xs text-white"
              />
              <button
                onClick={() => void copy()}
                className={`px-2 py-1 rounded text-xs ${copied ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => void revokeLink()}
              disabled={busy}
              className="w-full border border-gray-600 hover:bg-gray-700 rounded px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Revoke link
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
