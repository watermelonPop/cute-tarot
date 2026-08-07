import { useEffect, useRef, useState } from 'react'
import './MiniCard.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import '../components/MiniDeck.css'
import type { Deck, Card } from '../types'

interface NoFlipMiniCardProps {
  selectedDeck: Deck | undefined
  card: Card
  // Only provided by SelectCardPage (the picker) — DeckPanel's browsing
  // grid omits it, which is also what keeps the checkmark/confirm-delay
  // logic below entirely inert there.
  setCard?: (card: Card | null) => void
  isSelected?: boolean
}

// Brief pause between a pick registering and actually committing it (which
// typically closes the picker's modal) — just long enough for the checkmark
// swap to be visible before everything disappears.
const SELECT_CONFIRM_DELAY_MS = 150

function NoFlipMiniCard({ selectedDeck, card, setCard, isSelected }: NoFlipMiniCardProps) {
    const [pendingSelect, setPendingSelect] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isPickerContext = !!setCard
    // Unlike DeckTile/SpreadTile, there's no "other" context here where the
    // old abrupt swap-on-click should be preserved — the checkmark only
    // ever renders in picker mode at all, so showSelected must wait for the
    // real isSelected prop, letting pendingSelect fall through to the
    // confirming state below instead of skipping straight past it.
    const showSelected = isSelected
    const showConfirming = isPickerContext && pendingSelect && !isSelected

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    // Once the real isSelected prop confirms the pick landed, drop the
    // local flag — otherwise it lingers forever on tiles that stay mounted
    // across multiple picks, permanently stuck showing "selected" even
    // after a different tile is chosen later.
    useEffect(() => {
        if (isSelected) setPendingSelect(false)
    }, [isSelected])

    const commitSelect = () => {
        if (!setCard || pendingSelect) return
        setPendingSelect(true)
        timeoutRef.current = setTimeout(() => setCard(card), SELECT_CONFIRM_DELAY_MS)
    }

    const handleSelectClick = (e: React.MouseEvent) => {
        e.stopPropagation() // prevent the tile's own onClick from also firing
        commitSelect()
    }

    return (
        <div className="modalCardFace"
            data-card-id={card.id}
            onClick={isPickerContext ? commitSelect : undefined}
        >
            {isPickerContext && (
                showSelected ? (
                    <div className="deckCheckmarkSelected"><FontAwesomeIcon icon={faCheck}></FontAwesomeIcon></div>
                ) : (
                    <button
                        type="button"
                        className={`deckCheckmark${showConfirming ? ' confirming' : ''}`}
                        onClick={handleSelectClick}
                        aria-label={`Select ${card.name}`}
                    >
                        <FontAwesomeIcon icon={faCheck} className="deckCheckmarkIcon"/>
                    </button>
                )
            )}
            <div className='modalCardImgOuter'>
                <div className='cardImgOuterSmall'>
                    <img
                        src={`${selectedDeck?.images['card-front']}/${card?.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                        className="cardImg"
                        alt={`${card.name}`}
                    />
                </div>
            </div>
            <p className="cardDesc">
                {card.value} – {card.type}
            </p>
        </div>
    )
}

export default NoFlipMiniCard