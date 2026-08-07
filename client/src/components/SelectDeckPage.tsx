import '../components/MiniDeck.css'
import type { Deck } from '../types'
import DeckTile from './DeckTile'

interface SelectDeckPageProps {
    showModal: boolean
    decks: Deck[]
    setDeck: (deck: Deck) => void
    selectedDeck: Deck | null
}

export default function SelectDeckPage({ showModal, decks, setDeck, selectedDeck }: SelectDeckPageProps) {
    if (!showModal) return null

    return (
        <div className='modalOuterCards'>
            <div className='outerCardSuit'>
                <div className="outerDeckGrid">
                    {decks.map((deck) => (
                        <DeckTile
                            key={deck.id}
                            deck={deck}
                            isSelected={selectedDeck?.id === deck.id}
                            onSelect={() => setDeck(deck)}
                            showDescription={false}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
