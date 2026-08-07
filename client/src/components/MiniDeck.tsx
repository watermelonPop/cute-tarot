import type { User, Deck } from '../types'
import { useNavigate } from 'react-router-dom'
import DeckTile from './DeckTile'

interface MiniDeckProps {
  user: User | null
  selectedDeck: Deck | null
  deck: Deck
  setUserSelectedDeck: (deckId: string) => void
}

function MiniDeck({ selectedDeck, deck, setUserSelectedDeck }: MiniDeckProps) {
    const navigate = useNavigate();
    if (selectedDeck === null) {
        return;
    }

    return (
        <div className="miniDeckTile">
            <DeckTile
                deck={deck}
                isSelected={selectedDeck.id === deck.id}
                onSelect={() => setUserSelectedDeck(deck.id)}
                onClick={() => navigate(`/decks/${deck.name}`)}
            />
        </div>
    )
}

export default MiniDeck