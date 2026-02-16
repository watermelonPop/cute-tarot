import './MiniDeck.css'
import type { User, Deck } from '../types'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

interface MiniDeckProps {
  user: User | null
  selectedDeck: Deck | null
  deck: Deck
}

function MiniDeck({ selectedDeck, deck }: MiniDeckProps) {
    const navigate = useNavigate();
    if(selectedDeck === null || deck === null){
        return;
    }
  return (
    <>
    <div
        className={selectedDeck.id === deck.id ? "selectedDeck deckOuter": "deckOuter"}
        onClick={() => {
            navigate(`/decks/${deck.name}`)
        }}
        >
        {selectedDeck.id === deck.id && (
          <div className="deckCheckmark"><FontAwesomeIcon icon={faCheck}></FontAwesomeIcon></div>
        )}
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
        <h2 className="deckTitle">{deck.name}</h2>
        <p className='deckDesc'>{deck.description}</p>
      </div>
    </>
  )
}

export default MiniDeck
