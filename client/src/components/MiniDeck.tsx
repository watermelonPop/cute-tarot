import './MiniDeck.css'
import type { User, Deck } from '../types'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

interface MiniDeckProps {
  user: User | null
  selectedDeck: Deck | null
  deck: Deck
  setUserSelectedDeck: (deckId: string) => void
}

function MiniDeck({ selectedDeck, deck, setUserSelectedDeck }: MiniDeckProps) {
    const navigate = useNavigate();
    if(selectedDeck === null || deck === null){
        return;
    }

    const isSelected = selectedDeck.id === deck.id

    const handleSelectClick = (e: React.MouseEvent) => {
        e.stopPropagation() // prevent the card's own onClick (navigate) from also firing
        setUserSelectedDeck(deck.id)
    }

  return (
    <>
    <div
        className={isSelected ? "selectedDeck deckOuter": "deckOuter"}
        onClick={() => {
            navigate(`/decks/${deck.name}`)
        }}
        >
        {isSelected ? (
          <div className="deckCheckmarkSelected"><FontAwesomeIcon icon={faCheck}></FontAwesomeIcon></div>
        ) : (
          <button
            type="button"
            className="deckCheckmark"
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
            <div className="deckDescWrapper">
                <p className='deckDesc'>{deck.description}</p>
            </div>
        </div>
        </div>
      </div>
    </>
  )
}

export default MiniDeck