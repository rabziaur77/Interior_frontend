import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import type { Project } from '../engine/types'

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setProjects(await api.projects.list())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim() || 'Untitled Project'
    try {
      const project = await api.projects.create(name)
      navigate(`/editor/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    try {
      await api.projects.delete(id)
      setProjects((s) => s.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-12 bg-gray-900 text-white flex items-center justify-between px-4">
        <span className="font-semibold">My Projects</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user?.displayName}</span>
          <button onClick={clearAuth} className="text-sm text-gray-400 hover:text-white">Logout</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}

        <form onSubmit={createProject} className="mb-6 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New project name"
            className="flex-1 border rounded px-3 py-2"
          />
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700">
            New Project
          </button>
        </form>

        {loading && <p className="text-gray-500 text-sm">Loading projects...</p>}

        {!loading && projects.length === 0 && (
          <p className="text-gray-500 text-sm">No projects yet. Create one above.</p>
        )}

        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id} className="bg-white rounded-lg shadow flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-gray-500">Updated {formatDate(p.updatedAt)}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <button
                  onClick={() => navigate(`/editor/${p.id}`)}
                  className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700"
                >
                  Open
                </button>
                <button
                  onClick={() => deleteProject(p.id)}
                  className="bg-red-600 text-white rounded px-3 py-1.5 text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
