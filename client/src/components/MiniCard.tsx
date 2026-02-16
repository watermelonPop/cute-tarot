import './MiniCard.css'
import type { User, Deck, Card } from '../types'
import { useNavigate } from 'react-router-dom'

interface MiniCardProps {
  user: User | null
  selectedDeck: Deck | null
  card: Card
  width: number
}

/*
    id            String @id @default(uuid())
    type          String
    value         Int
    name          String
    nameShort     String @unique
    meaningUp     String
    meaningRev    String
    keywordsUp    String
    keywordsRev   String
    meaningAdvice String
    meaningLove   String
    meaningCareer String
    meaningYesNo  String
    descriptions  Json
*/

function MiniCard({ selectedDeck, card, width }: MiniCardProps) {
    const navigate = useNavigate()
    if (!selectedDeck || !card) {
        return <p>Loading</p>
    }

    if(width >= 400){
        return (
            <div
                className="cardOuter"
                onClick={() => {
                    navigate(`/cards/${card.nameShort}`)
                }}
                >

            <div className="cardFlip">
                {/* FRONT */}
                <div className="cardFace cardFront">
                    <div className='cardImgOuter'>
                        <div className='cardImgBorder'>
                            <img
                                src={`${selectedDeck.images['card-back']}`}
                                className="cardImg"
                                alt={`Deck back`}
                            />
                        </div>
                        <div className='cardImgBorder'>
                            <img
                                src={`${selectedDeck.images['card-front']}/${card.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                                className="cardImg"
                                alt={`${card.name}`}
                            />
                        </div>
                    </div>
                    <h3 className="cardTitle">{card.name}</h3>
                    <p className="cardDesc">
                        {card.value} – {card.type}
                    </p>
                </div>

                {/* BACK */}
                <div className="cardFace cardBack">
                    <h3 className="cardTitle">{card.name}</h3>
                    <h4 className="cardBackTitle">Keywords</h4>
                    <p className="cardKeywords">
                        <strong>Upright:</strong> {card.keywordsUp}
                    </p>
                    <p className="cardKeywords">
                        <strong>Reversed:</strong> {card.keywordsRev}
                    </p>
                </div>
            </div>
            </div>
        )
    }else if(width < 400){
        return (
            <div
                className="cardOuter"
                onClick={() => {
                    navigate(`/cards/${card.nameShort}`)
                }}
                >
                <div className="cardFace cardFront" onClick={() => {
                    navigate(`/cards/${card.nameShort}`)
                }}>
                    <div className='cardImgOuter'>
                        <div className='cardImgBorder'>
                            <img
                                src={`${selectedDeck.images['card-front']}/${card.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                                className="cardImg"
                                alt={`${card.name}`}
                            />
                        </div>
                        {width >= 400 && (
                            <div className='cardImgBorder'>
                                <img
                                    src={`${selectedDeck.images['card-back']}`}
                                    className="cardImg"
                                    alt={`Deck back`}
                                />
                            </div>
                        )}
                    </div>
                    <h3 className="cardTitle">{card.name}</h3>
                    <p className="cardDesc">
                        {card.value} – {card.type}
                    </p>
                </div>
            </div>
        )
    }
}

export default MiniCard
