import type { Spread } from '../types'
import './DeckSelect.css'

interface SpreadSelectProps {
    selectedSpread: Spread | null
    onSelect: () => void
}

export default function SpreadSelect({ selectedSpread, onSelect }: SpreadSelectProps) {
    return (
        <div className="deckSelectInput">
            <span className="deckSelectValue">{selectedSpread?.name ?? 'No spread selected'}</span>
            <button type="button" className="deckSelectBtn" onClick={onSelect}>Select</button>
        </div>
    )
}
