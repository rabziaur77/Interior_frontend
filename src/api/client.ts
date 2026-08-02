import { useAuthStore } from '../stores/authStore'
import type { Project, Asset, SharedScene } from '../engine/types'

const BASE = 'https://89-116-21-168.sslip.io/interior/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    useAuthStore.getState().clearAuth()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; displayName: string }) =>
      request<{ accessToken: string; refreshToken: string; expiresAt: string; user: { id: string; email: string; displayName: string } }>(
        '/auth/register', { method: 'POST', body: JSON.stringify(data) },
      ),
    login: (data: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string; expiresAt: string; user: { id: string; email: string; displayName: string } }>(
        '/auth/login', { method: 'POST', body: JSON.stringify(data) },
      ),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string; expiresAt: string; user: { id: string; email: string; displayName: string } }>(
        '/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) },
      ),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
  },
  projects: {
    list: () => request<Project[]>('/projects'),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (name: string) => request<Project>('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
    update: (id: string, data: { name: string; sceneData: string; version: number }) =>
      request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
    share: (id: string) => request<{ shareToken: string }>(`/projects/${id}/share`, { method: 'POST' }),
    unshare: (id: string) => request<void>(`/projects/${id}/share`, { method: 'DELETE' }),
  },
  share: {
    get: (token: string) => request<SharedScene>(`/share/${token}`),
  },
  assets: {
    list: (category?: string, search?: string) => {
      const q = new URLSearchParams()
      if (category) q.set('category', category)
      if (search) q.set('search', search)
      const qs = q.toString()
      return request<Asset[]>(`/assets${qs ? `?${qs}` : ''}`)
    },
    fileUrl: (id: string) => `${BASE}/assets/${id}/file`,
    thumbnailUrl: (id: string) => `${BASE}/assets/${id}/thumbnail`,
  },
}
