import { useEffect, useRef, useState } from 'react'
import type { Deck } from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import './MiniDeck.css'

interface DeckTileProps {
    deck: Deck
    isSelected: boolean
    onSelect: () => void
    // Whole-tile click, e.g. navigating to the deck's detail page. Omitted
    // by callers where clicking a tile should just pick it (the checkmark
    // button already handles that via onSelect).
    onClick?: () => void
    showDescription?: boolean
}

// Brief pause between a pick registering and actually committing it (which
// typically closes the picker's modal) — just long enough for the checkmark
// swap to be visible before everything disappears.
const SELECT_CONFIRM_DELAY_MS = 150

export default function DeckTile({ deck, isSelected, onSelect, onClick, showDescription = true }: DeckTileProps) {
    const [pendingSelect, setPendingSelect] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // Only picker contexts (SelectDeckPage — no onClick passed) get the
    // animated "hover-then-fill" confirm treatment below; browsing contexts
    // (MiniDeck) keep their original instant swap on checkmark click.
    const isPickerContext = !onClick
    const showSelected = isSelected || (pendingSelect && !isPickerContext)
    const showConfirming = isPickerContext && pendingSelect && !isSelected

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    // Once the real isSelected prop confirms the pick landed, drop the
    // local flag — otherwise it lingers forever on tiles that stay mounted
    // across multiple picks (e.g. DecksPanel's persistent grid), permanently
    // stuck showing "selected" even after a different tile is chosen later.
    useEffect(() => {
        if (isSelected) setPendingSelect(false)
    }, [isSelected])

    const commitSelect = () => {
        if (pendingSelect) return
        setPendingSelect(true)
        timeoutRef.current = setTimeout(onSelect, SELECT_CONFIRM_DELAY_MS)
    }

    const handleSelectClick = (e: React.MouseEvent) => {
        e.stopPropagation() // prevent the tile's own onClick (e.g. navigate) from also firing
        commitSelect()
    }

    return (
        <div
            className={showSelected ? "selectedDeck deckOuter" : "deckOuter"}
            // Browsing contexts (MiniDeck) pass onClick to navigate away.
            // Picker contexts (SelectDeckPage) don't pass onClick at all —
            // there, clicking anywhere on the tile should select it, same
            // as clicking the checkmark itself.
            onClick={onClick ?? commitSelect}
        >
            {showSelected ? (
                <div className="deckCheckmarkSelected"><FontAwesomeIcon icon={faCheck}></FontAwesomeIcon></div>
            ) : (
                <button
                    type="button"
                    className={`deckCheckmark${showConfirming ? ' confirming' : ''}`}
                    onClick={handleSelectClick}
                    aria-label={`Select ${deck.name} deck`}
                >
                    <FontAwesomeIcon icon={faCheck} className="deckCheckmarkIcon"/>
                </button>
            )}
            <div className="deckOuterInner">
                <div className='deckImgOuter'>
                    <div className='deckImgBorder'>
                        <img
                            src={`${deck.images['card-back']}`}
                            className="deckImg"
                            alt={`Deck back`}
                        />
                    </div>
                    <div className='deckImgBorder'>
                        <img
                            src={`${deck.images['card-front']}/MajorArcana/ar00.png`}
                            className="deckImg"
                            alt={`The Fool`}
                        />
                    </div>
                </div>
                <div className="cardInfoOuter">
                    <h2 className="deckTitle">{deck.name}</h2>
                    {showDescription && (
                        <div className="deckDescWrapper">
                            <p className='deckDesc'>{deck.description}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
