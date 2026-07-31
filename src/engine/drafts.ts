export interface SceneDraft {
  sceneData: string
  savedAt: string
}

const key = (projectId: string) => `scene-draft-${projectId}`

export function saveDraft(projectId: string, draft: SceneDraft): void {
  try {
    localStorage.setItem(key(projectId), JSON.stringify(draft))
  } catch {
    // localStorage may be unavailable (private mode / quota); auto-save still attempts server save.
  }
}

export function getDraft(projectId: string): SceneDraft | null {
  const raw = localStorage.getItem(key(projectId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as SceneDraft
  } catch {
    clearDraft(projectId)
    return null
  }
}

export function clearDraft(projectId: string): void {
  localStorage.removeItem(key(projectId))
}
