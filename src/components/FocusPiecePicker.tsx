import { ChevronDown } from 'lucide-react'
import type { Category, Garment } from '../types'
import { canWearTogether } from '../lib/focus-outfits'

const groups: [Category, string][] = [
  ['layers', 'Outerwear'], ['tops', 'Tops'], ['bottoms', 'Bottoms'], ['shoes', 'Shoes'],
]

interface Props {
  garments: Garment[]
  pieces: Garment[]
  unavailable: readonly string[]
  onChange: (ids: string[]) => void
}

export default function FocusPiecePicker({ garments, pieces, unavailable, onChange }: Props) {
  const [first, second] = pieces
  const owned = garments.filter(piece => piece.ownership === 'confirmed')

  function chooseFirst(id: string) {
    const piece = owned.find(garment => garment.id === id)
    if (!piece) return onChange(second ? [second.id] : [])
    onChange(second && canWearTogether(piece, second) ? [id, second.id] : [id])
  }

  function options(selected?: Garment, withPiece?: Garment) {
    const eligible = owned.filter(piece => piece.id === selected?.id || (
      !unavailable.includes(piece.id) && (!withPiece || canWearTogether(withPiece, piece))
    ))
    return groups.map(([category, label]) => {
      const options = eligible.filter(piece => piece.category === category).sort((a, b) => a.name.localeCompare(b.name))
      return options.length > 0 && <optgroup label={label} key={category}>
        {options.map(piece => <option key={piece.id} value={piece.id}>
          {piece.name}{unavailable.includes(piece.id) ? ' (unavailable)' : ''}
        </option>)}
      </optgroup>
    })
  }

  return <fieldset className="focus-piece-picker">
    <legend>Build around a piece</legend>
    <p>Choose one or two pieces to include in every suggestion.</p>
    <div className="focus-piece-fields">
      <label>First piece
        <span className="select-control">
          <select id="focus-first-piece" aria-label="First piece" value={first?.id ?? ''} onChange={event => chooseFirst(event.target.value)}>
            <option value="">Choose a piece</option>
            {options(first)}
          </select>
          <ChevronDown size={15} aria-hidden="true"/>
        </span>
      </label>
      <label>Second piece
        <span className="select-control">
          <select aria-label="Second piece" value={second?.id ?? ''} disabled={!first} onChange={event => {
            if (first) onChange(event.target.value ? [first.id, event.target.value] : [first.id])
          }}>
            <option value="">None</option>
            {first && options(second, first)}
          </select>
          <ChevronDown size={15} aria-hidden="true"/>
        </span>
      </label>
      {first && <button type="button" onClick={() => {
        onChange([])
        document.getElementById('focus-first-piece')?.focus({ preventScroll: true })
      }}>Clear pieces</button>}
    </div>
  </fieldset>
}
