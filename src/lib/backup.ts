import type { Garment } from '../types'
import { validatePersonal, validSelection, type Personal } from './personal'
import { mergeWardrobe, selectionFits } from './wardrobe'
import type { SavedLook } from './saved-looks'

export interface Backup { personal: Personal; saved: SavedLook[] }

export function validateBackup(value: unknown, base: Garment[]): Backup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid backup.')
  const data = value as { version?: unknown; personal?: unknown; saved?: unknown }
  if (data.version !== 1) throw Error('Unsupported backup version.')
  const personal = validatePersonal(data.personal)
  if (personal.edits.some(edit => base.some(piece => piece.id === edit.id && piece.category !== edit.category))) throw Error('A catalogue garment cannot change clothing category in a backup.')
  const garments = mergeWardrobe(base, personal.edits)
  if ([personal.draft,...personal.history.map(wear => wear.items)].some(items => items && !selectionFits(items,garments))) throw Error('Unknown garment or invalid clothing slot in backup.')
  if (!Array.isArray(data.saved) || data.saved.length > 1000) throw Error('Invalid saved looks.')
  const saved = data.saved as SavedLook[]
  if (saved.some(look => !look || typeof look.id !== 'string' || !look.id.trim() || look.id.length > 100 || typeof look.name !== 'string' || !look.name.trim() || look.name.length > 100 || !validSelection(look.items) || !selectionFits(look.items,garments))) throw Error('Invalid saved looks.')
  if (new Set(saved.map(look => look.id)).size !== saved.length) throw Error('Duplicate saved look IDs in backup.')
  return { personal, saved }
}
