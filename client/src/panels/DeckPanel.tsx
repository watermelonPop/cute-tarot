import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './DeckPanel.css'
import type { User, Deck, Card, Suit } from '../types'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import RiderWaiteIcon from '../assets/images/Rider-Waite/card-icon.svg?react'
import BunnyWaiteIcon from '../assets/images/Bunny-Waite/card-icon.svg?react'
import { Block } from '@uiw/react-color';

interface DeckPanelProps {
  user: User | null
  selectedDeck: Deck | null
  setSelectedDeck: (deck: Deck) => void
  showAlert: (msg: string) => void
  setLoading: (loading: boolean) => void
    token: string | null
}

function DeckPanel({ user, selectedDeck, setSelectedDeck, showAlert, setLoading, token }: DeckPanelProps) {
    const [cards, setCards] = useState<Card[]>([])
    const [decks, setDecks] = useState<Deck[]>([])
    const { deckName } = useParams()
    const navigate = useNavigate()
    const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
    const infoModalRef = useRef<HTMLDivElement | null>(null);
    const [adminEditing, setAdminEditing] = useState<boolean>(false);

    const [editableDeck, setEditableDeck] = useState<Deck | null>(null);

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

    useEffect(() => {
        if(infoModalRef.current === null){
            return;
        }
        if(infoModalOpen === true){
            infoModalRef.current.style.display = "flex";
        }else if(infoModalOpen === false){
            infoModalRef.current.style.display = "none";
        }
    }, [infoModalOpen]);


    const setUserSelectedDeck = async (deckId: string) => {
        if (!user || !token) {
            showAlert("You're logged out, this selection will disappear when you refresh!");

            const deckRes = await fetch(`/api/decks/${deckId}`);
            const fullDeck = await deckRes.json();
            setSelectedDeck(fullDeck);
            return;
        }

        try {
            const res = await fetch('/api/users/setDeck', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // 🔥 REQUIRED
            },
            body: JSON.stringify({
                userId: user.id,   // must match JWT userId
                deckId
            }),
            });

            if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to set deck");
            }

            const deckRes = await fetch(`/api/decks/${deckId}`);
            const fullDeck = await deckRes.json();
            setSelectedDeck(fullDeck);

        } catch (err) {
            console.error("Set deck failed:", err);
            showAlert("Failed to save deck selection.");
        }
    };

    const currentDeck = deckName ? decks.find(c => c.name === deckName) : null

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

    const CurrDeckIcon =
      currentDeck?.name?.replace(/[–—]/g, "-") === "Bunny-Waite"
        ? BunnyWaiteIcon
        : RiderWaiteIcon;
    
    if(currentDeck === null){
        return;
    }
    return (
        <>
            <div className='panel'>
                <div className='cardHeading'>
                    <button className='infoBtn' onClick={()=>setInfoModalOpen(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    <button className='deckHeadingBtn' onClick={() => navigate('/decks')}>
                        Back
                    </button>
                    <h2 className='innerCardTitle'>{currentDeck?.name} Deck</h2>
                    {currentDeck?.name === selectedDeck?.name ? (
                        <button className='deckHeadingBtn'>Selected</button>
                    ):(
                        <button className='deckHeadingBtn unselectedBtn' onClick={()=> {
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
                    <div className="topDeckCardOuter">
                        <div className='deckCardImgOuter'>
                            <CurrDeckIcon className="deckCardImg" />
                        </div>
                        <h3 className="cardTitle">Card Icon</h3>
                    </div>
                    <div className="topDeckCardOuter">
                        <div className='deckCardImgOuter'>
                            <img
                                src={`${currentDeck?.images['card-back']}`}
                                className="deckCardImg"
                                alt={`Deck back`}
                            />
                        </div>
                        <h3 className="cardTitle">Card Back</h3>
                    </div>
                </div>
                {groupedCards.map((group) =>
                    group.cards.length > 0 ? (
                        <>
                        <h3 className="innerSuitTitle">{group.suit}</h3>

                        <div className="outerDeckCardGrid">
                            {group.cards.map((card) => (
                                <div className={`deckCardOuter ${
                                    currentDeck?.id === selectedDeck?.id ? 'clickable' : ''
                                    }`} onClick={
                                        currentDeck?.id === selectedDeck?.id
                                            ? () => navigate(`/cards/${card.nameShort}`)
                                            : undefined
                                    }>
                                    <div className='deckCardImgOuter'>
                                        {currentDeck && (
                                            <img
                                                src={`${currentDeck.images['card-front']}/${card.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                                                className="deckCardImg"
                                                alt={card.name}
                                            />
                                        )}
                                    </div>
                                    <h3 className="cardTitle">{card.name}</h3>
                                </div>
                            ))}
                        </div>
                        </>
                    ) : null
                )}
            </div>
            <div className="modal" ref={infoModalRef}>
                <div className="modal-content">
                    <span className="close" onClick={()=>setInfoModalOpen(false)}>&times;</span>
                    <h2 className='modalPanelTitle'>Info</h2>
                    <div className='infoModals'>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Welcome to the {currentDeck?.name} Deck Page! 
                        </p>
                        {user !== null ? (
                            <>
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                The default selected deck is the Rider-Waite Deck. You are logged in, click select to equip this deck & theme!
                            </p> 
                            </>
                        ):(
                            <>
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                The default selected deck is the Rider-Waite Deck. Click select to equip this deck & theme! You're not logged in, so your selection will only last until refresh!
                            </p> 
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default DeckPanel