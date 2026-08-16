import { useEffect, useRef, useState } from 'react'
import './MiniCard.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import '../components/MiniDeck.css'
import type { Deck, Card } from '../types'

interface NoFlipMiniCardProps {
  selectedDeck: Deck | undefined
  card: Card
  setCard?: (card: Card | null) => void
  isSelected?: boolean
}

const SELECT_CONFIRM_DELAY_MS = 150

function NoFlipMiniCard({ selectedDeck, card, setCard, isSelected }: NoFlipMiniCardProps) {
    const [pendingSelect, setPendingSelect] = useState(false)
    const [imgLoaded, setImgLoaded] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isPickerContext = !!setCard
    const showSelected = isSelected
    const showConfirming = isPickerContext && pendingSelect && !isSelected

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    useEffect(() => {
        if (isSelected) setPendingSelect(false)
    }, [isSelected])

    const commitSelect = () => {
        if (!setCard || pendingSelect) return
        setPendingSelect(true)
        timeoutRef.current = setTimeout(() => setCard(card), SELECT_CONFIRM_DELAY_MS)
    }

    const handleSelectClick = (e: React.MouseEvent) => {
        e.stopPropagation()
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
                        className={`cardImg${imgLoaded ? ' loaded' : ''}`}
                        alt={`${card.name}`}
                        onLoad={() => setImgLoaded(true)}
                        onError={() => setImgLoaded(true)}
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