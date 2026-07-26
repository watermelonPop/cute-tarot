import './MiniCard.css'
import type { Deck, Card } from '../types'

interface NoFlipMiniCardProps {
  selectedDeck: Deck | undefined
  card: Card
  setCard?: (card: Card | null) => void
}

function NoFlipMiniCard({ selectedDeck, card, setCard }: NoFlipMiniCardProps) {
    return (
        <div className="modalCardFace" 
            onClick={()=>{
                setCard && setCard(card);
            }}
        >
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