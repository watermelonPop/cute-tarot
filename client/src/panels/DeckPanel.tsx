import { useState, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import '../App.css'
import './panel.css'
import './DeckPanel.css'
import type { User, Deck, Card, Suit } from '../types'
import { getDeckTheme } from '../types'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import NoFlipMiniCard from '../components/NoFlipMiniCard'
import RiderWaiteIcon from '../assets/images/Rider-Waite/card-icon.svg?react'
import BunnyWaiteIcon from '../assets/images/Bunny-Waite/card-icon.svg?react'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'

interface DeckPanelProps {
  user: User | null
  selectedDeck: Deck | null
  decks: Deck[]
  setDecks: Dispatch<SetStateAction<Deck[] | undefined>>
  cards: Card[]
  setUserSelectedDeck: (deckId: string) => void
  showAlert: (msg: string) => void
    token: string | null
    isMobile: () => boolean
}

function DeckPanel({ user, selectedDeck, decks, setDecks, cards, setUserSelectedDeck, showAlert, token, isMobile }: DeckPanelProps) {
    const { deckName } = useParams()
    const navigate = useNavigate()
    const [adminEditing, setAdminEditing] = useState<boolean>(false);

    const [editableDeck, setEditableDeck] = useState<Deck | null>(null);
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

    const currentDeck = deckName ? decks.find(c => c.name === deckName) : null
    const theme = getDeckTheme(currentDeck?.name)

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
                }),
            });

            // Handle HTTP errors
            if (!res.ok) {
            const err = await res.json();
                throw new Error(err.error || 'Failed to save deck');
            }

            // Updated card returned from server
            const updatedDeck: Deck = await res.json();

            // Update the shared App-level deck list
            setDecks(prev =>
                (prev ?? []).map(deck =>
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
                    {!isMobile() && <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>}
                    <button className='backBtn' onClick={() => navigate('/decks')}>
                        Back
                    </button>
                    <h2 className='deeperPanelTitle'>{currentDeck?.name} {!isMobile() && "Deck"}</h2>
                    {isMobile() && <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>}
                    {!isMobile() && (
                        <>
                        {currentDeck?.name === selectedDeck?.name ? (
                            <button className='backBtn'>Selected</button>
                        ):(
                            <button className='backBtn unselectedBtn' onClick={()=> {
                                if(currentDeck){setUserSelectedDeck(currentDeck?.id)}
                            }}>Select</button>
                        )}
                        </>
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
                                    {isMobile() && (
                    <div>
                    {currentDeck?.name === selectedDeck?.name ? (
                                <button className='backBtn'>Selected</button>
                            ):(
                                <button className='backBtn unselectedBtn' onClick={()=> {
                                    if(currentDeck){setUserSelectedDeck(currentDeck?.id)}
                                }}>Select</button>
                            )}
                        </div>
                    )}
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
                    <button className='deckHeadingBtn' onClick={()=>handleSaveEdits()}>Save Edits</button>
                )}
                <h3 className='innerSuitTitle'>Deck Icon & Back</h3>
                <div className='topOuterDeckCardGrid'>
                    <div className="modalCardFace">
                        <div className='modalCardImgOuter'>
                            <div className='cardImgOuter'>
                                <SelectedIcon className="cardImg" style={{backgroundColor: theme['main-background'], color: theme['accent-background']}}/>
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