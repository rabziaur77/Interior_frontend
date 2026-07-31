import { create } from 'zustand'
import type { Command } from '../engine/Command'

interface HistoryState {
  past: Command[]
  future: Command[]
  executeCommand: (command: Command) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  executeCommand: (command) => {
    command.execute()
    set((s) => ({
      past: [...s.past, command],
      future: [],
    }))
  },
  undo: () => {
    const { past } = get()
    if (past.length === 0) return
    const command = past[past.length - 1]
    command.undo()
    set((s) => ({
      past: s.past.slice(0, -1),
      future: [command, ...s.future],
    }))
  },
  redo: () => {
    const { future } = get()
    if (future.length === 0) return
    const command = future[0]
    command.execute()
    set((s) => ({
      past: [...s.past, command],
      future: s.future.slice(1),
    }))
  },
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
}))
