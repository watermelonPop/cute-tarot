import type { Deck } from '../types'
import './DeckSelect.css'

interface DeckSelectProps {
    selectedDeck: Deck | null
    onSelect: () => void
}

export default function DeckSelect({ selectedDeck, onSelect }: DeckSelectProps) {
    return (
        <div className="deckSelectInput">
            <span className="deckSelectValue">{selectedDeck?.name ?? 'No deck selected'}</span>
            <button type="button" className="deckSelectBtn" onClick={onSelect}>Select</button>
        </div>
    )
}
