import './SelectCardPage.css'
import type {Card, Deck} from '../types'
import NoFlipMiniCard from './NoFlipMiniCard'

interface SelectCardPageProps {
    setCard: (card: Card | null) => void;
    showModal: boolean;
    groupedCards: {suit: string, cards: any[]}[];
    selectedDeck: Deck;
}
export default function SelectCardPage({ showModal, groupedCards, setCard, selectedDeck }: SelectCardPageProps) {
    if(!showModal) return null;

    return (
        <div className='modalOuterCards'>
            {groupedCards.map((group) =>
                group.cards.length > 0 ? (
                    <div key={group.suit} className='outerCardSuit'>
                        <h3 className="suitHeading underHeading">{group.suit}</h3>

                        <div className="modalOuterCardsGrid">
                            {group.cards.map((card) => {
                                return (
                                    <NoFlipMiniCard selectedDeck={selectedDeck} card={card} setCard={setCard}></NoFlipMiniCard>
                                )
                            })}
                        </div>
                    </div>
                ) : null
            )}
        </div>
    )
}
