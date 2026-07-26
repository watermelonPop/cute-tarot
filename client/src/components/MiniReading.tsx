import { useState } from 'react'
import type {Deck, Reading, Card, Spread } from '../types'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../components/ConfirmModal'

interface MiniReadingProps {
    cards: Card[]
    selectedDeck: Deck | null
    reading: Reading
    spreads: Spread[]
    editingReadings?: boolean
    onDeleteReading?: (readingId: string) => void
}

function MiniReading({ selectedDeck, reading, cards, spreads, editingReadings, onDeleteReading }: MiniReadingProps) {
    const navigate = useNavigate();
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  return (
    <>
    <div
        className="spreadOuter"
        onClick={() => navigate(`/readings/${reading.id}`)}
        style={{position: "relative"}}
        >
        {editingReadings && (
            <button
                type="button"
                className="deckCheckmarkSelected"
                onClick={(e)=> {
                    e.stopPropagation(); // prevent the card's own onClick (navigate) from also firing
                    setShowConfirmModal(true);
                }}
                aria-label={`Delete Reading`}
                style={{opacity: 1}}
            >
                <FontAwesomeIcon icon={faTrash}/>
            </button>
        )}
        <div className='spreadImgOuter'>
            {reading.cards.map((cardId, idx) => {
                const card = cards.find(c => c.id === cardId);

                if (!card) return null;

                return (
                <div key={cardId} className="spreadImgBorder">
                    <img
                    src={`${selectedDeck?.images['card-front']}/${card.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                    className={reading.reversalValues[idx] === true ? "spreadImg upside-down" : "spreadImg"}
                    alt={`Deck card ${card.name}`}
                    />
                </div>
                );
            })}
        </div>
        <h2 className="spreadTitle"><span className="spreadTitleClamp">{reading.name}</span></h2>
        <div className="readingDetails">
            <p>{formatDate(reading.date)}</p>
            {reading.reversals === true && (
                <p>Reversals allowed.</p>
            )}
            <p>
                {spreads.find(s => s.id === reading.spread)?.name}
            </p>
            <p>{reading.topic}</p>
        </div>
      </div>
      <ConfirmModal
        prompt={`Delete "${reading.name}"? This can't be undone.`}
        showModal={showConfirmModal}
        setShowModal={setShowConfirmModal}
        onConfirm={() => {
            if (onDeleteReading !== undefined) onDeleteReading(reading.id);
            setShowConfirmModal(false);
        }}
      />
    </>
  )
}

export default MiniReading