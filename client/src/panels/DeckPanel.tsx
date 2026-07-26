import { useState, useEffect } from 'react'
import '../App.css'
import './panel.css'
import './DeckPanel.css'
import type { User, Deck, Card, Suit } from '../types'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { Block } from '@uiw/react-color';
import NoFlipMiniCard from '../components/NoFlipMiniCard'
import RiderWaiteIcon from '../assets/images/Rider-Waite/card-icon.svg?react'
import BunnyWaiteIcon from '../assets/images/Bunny-Waite/card-icon.svg?react'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'

interface DeckPanelProps {
  user: User | null
  selectedDeck: Deck | null
  setUserSelectedDeck: (deckId: string) => void
  showAlert: (msg: string) => void
  setLoading: (loading: boolean) => void
    token: string | null
    isMobile: () => boolean
}

function DeckPanel({ user, selectedDeck, setUserSelectedDeck, showAlert, setLoading, token, isMobile }: DeckPanelProps) {
    const [cards, setCards] = useState<Card[]>([])
    const [decks, setDecks] = useState<Deck[]>([])
    const { deckName } = useParams()
    const navigate = useNavigate()
    const [adminEditing, setAdminEditing] = useState<boolean>(false);

    const [editableDeck, setEditableDeck] = useState<Deck | null>(null);
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);


    useEffect(() => {
        setLoading(true);
        fetch('/api/decks')
            .then(res => res.json())
            .then((data: Deck[]) => {
                setDecks(data);
                fetch('/api/cards')
                .then(res => res.json())
                .then((data: Card[]) => {
                    setCards(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch cards:', err);
                    setLoading(false);
                })
            })
            .catch(err => {
                console.error('Failed to fetch decks:', err);
                setLoading(false);
            });
    }, []);

    const currentDeck = deckName ? decks.find(c => c.name === deckName) : null

    const SelectedIcon = 
        currentDeck?.name?.replace(/[–—]/g, "-") === "Bunny-Waite"
        ? BunnyWaiteIcon
        : RiderWaiteIcon;

    useEffect(() => {
        if (currentDeck) {
            setEditableDeck(currentDeck);
        }
    }, [currentDeck]);

    const autoResize = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = "auto";            // reset
        el.style.height = `${el.scrollHeight}px`; // grow to fit
    };

    const handleSaveEdits = async () => {
        if(user?.type !== "Admin" || adminEditing === false || !currentDeck?.id){
            showAlert("Not authorized for editing.");
            return;
        }

        try {
            const res = await fetch(`/api/decks/${currentDeck?.id}/updateDeck`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    description: editableDeck?.description,
                    style: editableDeck?.style
                }),
            });

            // Handle HTTP errors
            if (!res.ok) {
            const err = await res.json();
                throw new Error(err.error || 'Failed to save deck');
            }

            // Updated card returned from server
            const updatedDeck: Deck = await res.json();

            // Update local state
            setDecks(prev =>
                prev.map(deck =>
                    deck.id === updatedDeck.id ? updatedDeck : deck
                )
            );
            setEditableDeck(updatedDeck);
            setAdminEditing(false);

        } catch (err) {
            console.error('Failed to save card:', err);
            showAlert('Failed to save card. Please try again.');
        }
    }

    // Desired display order
    const suitOrder: Suit[] = [
    'Major Arcana',
    'Wands',
    'Cups',
    'Coins',
    'Swords',
    ];

    // Group + sort cards
    const groupedCards = suitOrder.map((suit) => {
        const suitCards = cards
            .filter((card) => card.type === suit)
            .sort((a, b) => a.value - b.value); // numeric sort

        return {
            suit,
            cards: suitCards,
        };
    });
    
    if(currentDeck === null){
        return;
    }
    return (
        <>
            <div className='panel'>
                <div className='deeperPanelHeading'>
                    <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    <button className='backBtn' onClick={() => navigate('/decks')}>
                        Back
                    </button>
                    <h2 className='deeperPanelTitle'>{currentDeck?.name} {!isMobile() && "Deck"}</h2>
                    {currentDeck?.name === selectedDeck?.name ? (
                        <button className='backBtn'>Selected</button>
                    ):(
                        <button className='backBtn unselectedBtn' onClick={()=> {
                            if(currentDeck){setUserSelectedDeck(currentDeck?.id)}
                        }}>Select</button>
                    )}
                    {
                        user?.type === "Admin" && (
                            adminEditing === true ? (
                                <button className='deckHeadingBtn' onClick={()=>setAdminEditing(false)}>
                                    Cancel Edit
                                </button>
                            ):(
                                <button className='deckHeadingBtn' onClick={()=>setAdminEditing(true)}>
                                    Edit
                                </button>
                            )
                        )
                    }
                </div>
                <div className='deckCardDesc'>
                    {user?.type !== "Admin" || adminEditing === false ? (
                        <p>{currentDeck?.description}</p>
                    ):(
                        <>
                        <div className='cardEditInput'>
                            <label>Description: </label>
                            <textarea ref={(el) => autoResize(el)} value={editableDeck?.description} onChange={(e) => {
                                if (!editableDeck) return;

                                setEditableDeck({
                                ...editableDeck,
                                description: e.target.value,
                                });
                            }}></textarea>
                        </div>
                        </>
                    )}
                </div>
                {user?.type === "Admin" && adminEditing === true && (
                    <>
                    <div className='colorGrid'>
                        {Object.keys(currentDeck?.style ?? {}).filter(
                            (styleKey) =>
                                styleKey !== "border-radius" &&
                                styleKey !== "border-radius-small"
                            )
                            .map((styleKey) => (
                            <div className='deckColorInput'>
                                <label>{styleKey} Color: </label>
                                <Block
                                    className='colorInput'
                                    style={{ marginLeft: 20 }}
                                    color={editableDeck?.style[styleKey]}
                                    onChange={(color) => {
                                        if (!editableDeck) return;

                                        setEditableDeck({
                                            ...editableDeck,
                                            style: {
                                                ...editableDeck.style,
                                                [styleKey]: color.hex,
                                            },
                                        });
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    <button className='deckHeadingBtn' onClick={()=>handleSaveEdits()}>Save Edits</button>
                    </>
                )}
                <h3 className='innerSuitTitle'>Deck Icon & Back</h3>
                <div className='topOuterDeckCardGrid'>
                    <div className="modalCardFace">
                        <div className='modalCardImgOuter'>
                            <div className='cardImgOuter'>
                                <SelectedIcon className="cardImg" />
                            </div>
                        </div>
                        <p className="cardDesc">
                            Card Icon
                        </p>
                    </div>
                    <div className="modalCardFace">
                        <div className='modalCardImgOuter'>
                            <div className='cardImgOuter'>
                                <img
                                    src={`${currentDeck?.images['card-back']}`}
                                    className="cardImg"
                                    alt={`Deck back`}
                                />
                            </div>
                        </div>
                        <p className="cardDesc">
                            Card Back
                        </p>
                    </div>
                </div>
                {groupedCards.map((group) =>
                    group.cards.length > 0 ? (
                        <>
                        <h3 className="innerSuitTitle">{group.suit}</h3>

                        <div className="modalOuterCardsGrid">
                            {group.cards.map((card) => (
                                <NoFlipMiniCard selectedDeck={currentDeck} card={card}></NoFlipMiniCard>
                            ))}
                        </div>
                        </>
                    ) : null
                )}
            </div>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage 
                    infoMessages={[
                        `Welcome to the ${currentDeck?.name} Deck Page!`,
                        `Click select to equip this deck & theme!`,
                        ...(user == null 
                            ? [`You're not logged in, so your selection will only last until refresh!`] 
                            : []),
                    ].filter(Boolean)} 
                />
            </Modal>
        </>
    )
}

export default DeckPanel