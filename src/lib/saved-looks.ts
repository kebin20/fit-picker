import type { Selection } from '../types'
import { sameSelection } from './wardrobe'

export interface SavedLook { id: string; name: string; items: Selection; saved: string }

/** Updating A to B's existing clothes must leave one saved combination. */
export function upsertSavedLook(saved: SavedLook[], items: Selection, name: string, editingId?: string | null): SavedLook[] {
  const editing = saved.find(look => look.id === editingId)
  const duplicate = saved.find(look => sameSelection(look.items, items))
  const id = editing?.id || duplicate?.id || crypto.randomUUID()
  return [
    { id, name: name.trim(), items: { ...items }, saved: new Date().toISOString() },
    ...saved.filter(look => look.id !== id && !sameSelection(look.items, items)),
  ]
}
