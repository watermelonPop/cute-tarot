import { useState } from 'react'
import './App.css'
import './PhysicalCard.css'
import InteractiveCard from './components/InteractiveCard'
import type {Deck, Card} from './types'
import { getDeckTheme } from './types'
import { useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom'
import TableOfContents from './components/TableOfContents'
import { buildCardToc } from './panels/CardPanel'

interface PhysicalCardProps {
    decks: Deck[]
    cards: Card[]
    setUserSelectedDeck: (deckId: string) => void
}

function PhysicalCard({ decks, cards, setUserSelectedDeck }: PhysicalCardProps) {
    const { deckName, cardNameShort } = useParams();
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    // Find the card based on the URL param
    const currentCard = cardNameShort ? cards.find(c => c.nameShort === cardNameShort) : null;
    
    const currentDeck = deckName ? decks.find(c => c.name.replace(/[–—]/g, "-") === deckName) : null
    const theme = getDeckTheme(currentDeck?.name)


    return (
        <>
            <div className='physCardOuter' style={{ backgroundColor: theme['main-background'], color:  theme['main-text']}}>
                <h2>{currentCard?.name}</h2>
                <div className='physImgsOuter'>
                    <div className='physImgOuter' style={{ backgroundColor: theme['secondary-background'] }}>
                        <img
                            src={`${currentDeck?.images['card-back']}`}
                            className="physCardImg"
                            alt={`Deck back`}
                        />
                    </div>
                    <div className='physImgOuter' style={{ backgroundColor: theme['secondary-background'] }}>
                        <img
                            src={`${currentDeck?.images['card-front']}/${currentCard?.type.replaceAll(" ", "")}/${currentCard?.nameShort}.png`}
                            className="physCardImg"
                            alt={`Deck card ${currentCard?.name}`}
                        />
                    </div>
                </div>
                <div className='physInfoDiv'>
                    <div className='physViewBtnOuter'>
                        <button
                            className='backBtn'
                            style={{
                                backgroundColor: theme['accent-background'],
                                color: theme['accent-text']
                            }}
                            onClick={() => setShowModal(true)}
                            >
                            Inspect
                        </button>
                        <button
                            className='backBtn'
                            style={{
                                backgroundColor: theme['accent-background'],
                                color: theme['accent-text']
                            }}
                            onClick={() => {
                                // The physical card page is scoped to a specific deck (the
                                // one printed on the card the user is holding), but CardPanel
                                // renders descriptions/images off whichever deck is currently
                                // equipped — without this, "View" could land on the card page
                                // showing an entirely different deck's artwork/description.
                                if (currentDeck) setUserSelectedDeck(currentDeck.id)
                                navigate(`/cards/${currentCard?.nameShort}`)
                            }}
                            >
                            View
                            <FontAwesomeIcon icon={faArrowUpRightFromSquare}></FontAwesomeIcon>
                        </button>
                    </div>
                    <div className='cardDescription'>
                        <TableOfContents items={buildCardToc(currentCard!)} />
                        <p className="centered">{currentCard?.value} - {currentCard?.type}</p>
                        <h3 id="keywordsSection" className="sectionHeading">Keywords</h3>
                        <p className="centered">Upright: {currentCard?.keywordsUp}</p>
                        <p className="centered">Reversed: {currentCard?.keywordsRev}</p>
                        <h3 id="descriptionSection" className="sectionHeading">Description</h3>
                        <p className='cardParagraph'>{currentDeck !== null && currentDeck !== undefined ? currentCard?.descriptions[currentDeck.id]: ""}</p>
                        <h3 id="meaningsSection" className="sectionHeading">Meanings</h3>
                        <h4 id="meaningUpright" className="subHeading">Upright: </h4>
                        <p className='cardParagraph'>{currentCard?.meaningUp}</p>
                        <h4 id="meaningReversed" className="subHeading">Reversed: </h4>
                        <p className='cardParagraph'>{currentCard?.meaningRev}</p>
                        <h4 id="meaningYesNo" className="subHeading">Yes or No: </h4>
                        <p className='cardParagraph'>{currentCard?.meaningYesNo}</p>
                        <h4 id="meaningAdvice" className="subHeading">Advice: </h4>
                        <p className='cardParagraph'>{currentCard?.meaningAdvice}</p>
                        <h4 id="meaningLove" className="subHeading">Love and Relationships: </h4>
                        <p className='cardParagraph'>{currentCard?.meaningLove}</p>
                        <h4 id="meaningCareer" className="subHeading">Career: </h4>
                        <p className='cardParagraph'>{currentCard?.meaningCareer}</p>
                    </div>
                </div>
            </div>
            {showModal && (
                <div className="cardModal">
                    <div
                    className="card3dScene"
                    onClick={(e) => e.stopPropagation()}
                    >
                    <InteractiveCard
                        front={`${currentDeck?.images['card-front']}/${currentCard?.type.replaceAll(" ", "")}/${currentCard?.nameShort}.png`}
                        back={`${currentDeck?.images['card-back']}`}
                    />
                    </div>
                    <button className='physViewBtn' onClick={() => setShowModal(false)} style={{
                        backgroundColor: theme['accent-background'],
                        color: theme['accent-text']
                    }}>Close</button>
                </div>
            )}
        </>
    )
}

export default PhysicalCard