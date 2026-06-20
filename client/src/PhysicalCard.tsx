import { useState, useEffect } from 'react'
import './App.css'
import './PhysicalCard.css'
import InteractiveCard from './components/InteractiveCard'
import type {Deck, Card} from './types'
import { useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom'
import Loader from './components/Loader'

function PhysicalCard() {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const { deckName, cardNameShort } = useParams();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            try {
                const [decksRes, cardsRes] = await Promise.all([
                    fetch('/api/decks'),
                    fetch('/api/cards')
                ]);

                const decksData: Deck[] = await decksRes.json();
                const cardsData: Card[] = await cardsRes.json();

                setDecks(decksData);
                setCards(cardsData);
            } catch (err) {
                console.error('Failed to load data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [setLoading]);

    // Find the card based on the URL param
    const currentCard = cardNameShort ? cards.find(c => c.nameShort === cardNameShort) : null;
    
    const currentDeck = deckName ? decks.find(c => c.name.replace(/[–—]/g, "-") === deckName) : null


    return (
        <>
            {loading && (
              <Loader/>
            )}
            <div className='physCardOuter' style={{ backgroundColor: currentDeck?.style['main-background'], color:  currentDeck?.style['main-text']}}>
                <h2>{currentCard?.name}</h2>
                <div className='physImgsOuter'>
                    <div className='physImgOuter' style={{ backgroundColor: currentDeck?.style['secondary-background'] }}>
                        <img
                            src={`${currentDeck?.images['card-back']}`}
                            className="physCardImg"
                            alt={`Deck back`}
                        />
                    </div>
                    <div className='physImgOuter' style={{ backgroundColor: currentDeck?.style['secondary-background'] }}>
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
                            className='physViewBtn'
                            style={{
                                backgroundColor: currentDeck?.style['accent-background'],
                                color: currentDeck?.style['accent-text']
                            }}
                            onClick={() => setShowModal(true)}
                            >
                            Inspect
                        </button>
                        <button
                            className='physViewBtn'
                            style={{
                                backgroundColor: currentDeck?.style['accent-background'],
                                color: currentDeck?.style['accent-text']
                            }}
                            onClick={() => navigate(`/cards/${currentCard?.nameShort}`)}
                            >
                            View
                            <FontAwesomeIcon icon={faArrowUpRightFromSquare}></FontAwesomeIcon>
                        </button>
                    </div>
                    <p>{currentCard?.value} - {currentCard?.type}</p>
                    <h3>Keywords</h3>
                    <p className='physCardParagraph'>Upright: {currentCard?.keywordsUp}</p>
                    <p className='physCardParagraph'>Reversed: {currentCard?.keywordsRev}</p>
                    <h3>Description</h3>
                    <p className='physCardParagraph'>{currentDeck !== null && currentDeck !== undefined ? currentCard?.descriptions[currentDeck.id]: ""}</p>
                    <h3>Meanings</h3>
                    <h4>Upright: </h4>
                    <p className='physCardParagraph'>{currentCard?.meaningUp}</p>
                    <h4>Reversed: </h4>
                    <p className='physCardParagraph'>{currentCard?.meaningRev}</p>
                    <h4>Yes or No: </h4>
                    <p className='physCardParagraph'>{currentCard?.meaningYesNo}</p>
                    <h4>Advice: </h4>
                    <p className='physCardParagraph'>{currentCard?.meaningAdvice}</p>
                    <h4>Love and Relationships: </h4>
                    <p className='physCardParagraph'>{currentCard?.meaningLove}</p>
                    <h4>Career: </h4>
                    <p className='physCardParagraph'>{currentCard?.meaningCareer}</p>
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
                        backgroundColor: currentDeck?.style['accent-background'],
                        color: currentDeck?.style['accent-text']
                    }}>Close</button>
                </div>
            )}
        </>
    )
}

export default PhysicalCard