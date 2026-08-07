import { useEffect, useRef } from 'react'
import './SelectCardPage.css'
import type {Card, Deck} from '../types'
import NoFlipMiniCard from './NoFlipMiniCard'

interface SelectCardPageProps {
    setCard: (card: Card | null) => void;
    showModal: boolean;
    groupedCards: {suit: string, cards: any[]}[];
    selectedDeck: Deck;
    selectedCard?: Card | null;
}
export default function SelectCardPage({ showModal, groupedCards, setCard, selectedDeck, selectedCard }: SelectCardPageProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)

    // The modal (and this component along with it) mounts fresh each time
    // it opens — showModal false means the parent doesn't render this at
    // all — so a mount-only effect is exactly "when the modal opens."
    useEffect(() => {
        if (!selectedCard) return
        const el = containerRef.current?.querySelector<HTMLElement>(
            `[data-card-id="${selectedCard.id}"]`
        )
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if(!showModal) return null;

    return (
        <div className='modalOuterCards' ref={containerRef}>
            {groupedCards.map((group) =>
                group.cards.length > 0 ? (
                    <div key={group.suit} className='outerCardSuit'>
                        <h3 className="suitHeading underHeading">{group.suit}</h3>

                        <div className="modalOuterCardsGrid">
                            {group.cards.map((card) => {
                                return (
                                    <NoFlipMiniCard
                                        key={card.id}
                                        selectedDeck={selectedDeck}
                                        card={card}
                                        setCard={setCard}
                                        isSelected={selectedCard?.id === card.id}
                                    ></NoFlipMiniCard>
                                )
                            })}
                        </div>
                    </div>
                ) : null
            )}
        </div>
    )
}
