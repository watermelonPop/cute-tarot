import { useEffect, useRef, useState } from 'react'
import type { Spread } from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import '../components/MiniDeck.css'

interface SpreadTileProps {
    spread: Spread
    CardIcon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
    // Whole-tile click, e.g. navigating to the spread's detail page.
    onClick?: () => void
    // Checkmark/select-button UI only appears when these are provided —
    // browsing contexts (SpreadsPanel) have no notion of a "selected"
    // spread, only the picker (SelectSpreadPage) does.
    isSelected?: boolean
    onSelect?: () => void
    showDescription?: boolean
}

// Brief pause between a pick registering and actually committing it (which
// typically closes the picker's modal) — just long enough for the checkmark
// swap to be visible before everything disappears.
const SELECT_CONFIRM_DELAY_MS = 150

export default function SpreadTile({ spread, CardIcon, onClick, isSelected, onSelect, showDescription = true }: SpreadTileProps) {
    const [pendingSelect, setPendingSelect] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // Only picker contexts (SelectSpreadPage — no onClick passed) get the
    // animated "hover-then-fill" confirm treatment below; browsing contexts
    // (MiniSpread) keep their original instant swap on checkmark click.
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
    // across multiple picks, permanently stuck showing "selected" even
    // after a different tile is chosen later.
    useEffect(() => {
        if (isSelected) setPendingSelect(false)
    }, [isSelected])

    const commitSelect = () => {
        if (!onSelect || pendingSelect) return
        setPendingSelect(true)
        timeoutRef.current = setTimeout(onSelect, SELECT_CONFIRM_DELAY_MS)
    }

    const handleSelectClick = (e: React.MouseEvent) => {
        e.stopPropagation() // prevent the tile's own onClick (e.g. navigate) from also firing
        commitSelect()
    }

    return (
        <div
            className={showSelected ? "selectedDeck spreadOuter" : "spreadOuter"}
            // Browsing contexts (MiniSpread) pass onClick to navigate away.
            // Picker contexts (SelectSpreadPage) don't pass onClick at all —
            // there, clicking anywhere on the tile should select it, same
            // as clicking the checkmark itself.
            onClick={onClick ?? (onSelect ? commitSelect : undefined)}
        >
            {onSelect && (
                showSelected ? (
                    <div className="deckCheckmarkSelected"><FontAwesomeIcon icon={faCheck}></FontAwesomeIcon></div>
                ) : (
                    <button
                        type="button"
                        className={`deckCheckmark${showConfirming ? ' confirming' : ''}`}
                        onClick={handleSelectClick}
                        aria-label={`Select ${spread.name} spread`}
                    >
                        <FontAwesomeIcon icon={faCheck} className="deckCheckmarkIcon"/>
                    </button>
                )
            )}
            <div className='spreadImgOuter'>
                {Array.from({ length: spread.numPulls }).map((_, i) => (
                    <div key={i} className='spreadImgBorder'>
                        <CardIcon className="spreadImg"/>
                    </div>
                ))}
            </div>
            <h2 className="spreadTitle"><span className="spreadTitleClamp">{spread.name}</span></h2>
            {showDescription && <p className='spreadDesc'>{spread.description}</p>}
        </div>
    )
}
