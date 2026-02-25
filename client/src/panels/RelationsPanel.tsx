import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './RelationsPanel.css'
import Sparkles from '../components/Sparkles'
import type { User, Deck, Relation, Card, Suit } from '../types'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

interface RelationsPanelProps {
    user: User | null
    selectedDeck: Deck | null
    width: number
    showAlert: (msg: string) => void
    setLoading: (loading: boolean) => void
    token: string | null
}


function RelationsPanel({ user, selectedDeck, width, showAlert, setLoading, token }: RelationsPanelProps) {
    const [firstCard, setFirstCard] = useState<Card | null>(null);
    const [secondCard, setSecondCard] = useState<Card | null>(null);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [modalCard, setModalCard] = useState<number>(0);
    const [cards, setCards] = useState<Card[]>([])
    const [showDescription, setShowDescription] = useState(false);
    const [currentRelation, setCurrentRelation] = useState<Relation | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
    const infoModalRef = useRef<HTMLDivElement | null>(null);
    const [isAnimating, setIsAnimating] = useState(false)
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    const navigate = useNavigate();
    const [adminEditing, setAdminEditing] = useState<boolean>(false);

    const [editableRelation, setEditableRelation] = useState<Relation | null>(null);
    

    const { nameShort1, nameShort2 } = useParams();

    useEffect(() => {
        if (cards.length === 0) return;

        // Always reset first
        let card1: Card | null = null;
        let card2: Card | null = null;

        if (nameShort1) {
            card1 = cards.find(c => c.nameShort === nameShort1) || null;
        }

        if (nameShort2) {
            card2 = cards.find(c => c.nameShort === nameShort2) || null;
        }

        setFirstCard(card1);
        setSecondCard(card2);
    }, [cards, nameShort1, nameShort2]);




    useEffect(() => {
        if(modalRef.current === null){
            return;
        }
        if(modalOpen === true){
            setCurrentRelation(null);
            modalRef.current.style.display = "flex";
        }else if(modalOpen === false){
            modalRef.current.style.display = "none";
        }
    }, [modalOpen]);

    useEffect(() => {
        if(infoModalRef.current === null){
            return;
        }
        if(infoModalOpen === true){
            setCurrentRelation(null);
            infoModalRef.current.style.display = "flex";
        }else if(infoModalOpen === false){
            infoModalRef.current.style.display = "none";
        }
    }, [infoModalOpen]);

    useEffect(() => {
        setModalOpen(false);
        setModalCard(0);
    }, [firstCard, secondCard]);

    useEffect(() => {
        setShowDescription(false);
        setCurrentRelation(null); // optional, forces new fetch if needed
    }, [firstCard, secondCard]);

    useEffect(() => {
        setLoading(true);
        fetch('/api/cards')
        .then(res => res.json())
        .then(data => {
            setCards(data);
            setLoading(false);
        })
    }, []);

    useEffect(() => {

        if (!firstCard || !secondCard){

            return;
        }

        // Only fetch if currentRelation is null to prevent double fetching
        if (!currentRelation) {
            fetch('/api/relations/nCardRelations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardIds: [firstCard.id, secondCard.id] }),
            })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                setCurrentRelation(data.relations[0]);
            })
            .catch(err => {
                console.error('Error fetching relation:', err);
            });
        }
    }, [firstCard, secondCard]);

    useEffect(() => {
        if (showDescription && headingRef.current) {
            headingRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, [showDescription]);



    const handleEnterClick = () => {
        if (!firstCard || !secondCard){
            showAlert("Please select both cards before clicking enter.");
            return;
        }

        if(firstCard.nameShort === secondCard.nameShort){
            showAlert("Please select 2 different cards.");
            return;
        }

        setIsAnimating(true);
        enterRelation();

        // animation length ≈ 3s
        setTimeout(() => {
            setIsAnimating(false);

            // Navigate to route with both cards
            navigate(`/relations/${firstCard.nameShort}/${secondCard.nameShort}`);

            // Only now show the description
            setShowDescription(true);
        }, 3000);
    };


    const enterRelation = async () => {
        if(firstCard === null || secondCard === null){
            showAlert("Both cards must be selected.");
            return;
        }
        fetch('/api/relations/nCardRelations', {
            method: 'POST', // POST instead of GET
            headers: {
                'Content-Type': 'application/json', // tell the server it's JSON
            },
            body: JSON.stringify({
                cardIds: [firstCard.id, secondCard.id]
            }),
            })
            .then(res => {
                if (!res.ok) {
                // handle HTTP errors
                throw new Error(`HTTP error! status: ${res.status}`)
                }
                return res.json() // parse JSON response
            })
            .then(data => {
                console.log("USE EFFE");
                console.log(data);
                setCurrentRelation(data.relations[0])
            })
            .catch(err => {
                console.error('Error creating user:', err)
            })
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

    useEffect(() => {
        if (currentRelation) {
            setEditableRelation(currentRelation);
        }
    }, [currentRelation]);

    const autoResize = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = "auto";            // reset
        el.style.height = `${el.scrollHeight}px`; // grow to fit
    };

    const handleSaveEdits = async () => {
        if(user?.type !== "Admin" || adminEditing === false || !editableRelation?.id || !token){
            showAlert("Not authorized for editing.");
            return;
        }

        try {
            const res = await fetch(`/api/relations/${editableRelation?.id}/updateRelation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    description: editableRelation.description, 
                    descriptionAdvice: editableRelation.descriptionAdvice, 
                    descriptionLove: editableRelation.descriptionLove, 
                    descriptionCareer: editableRelation.descriptionCareer
                }),
            });

            // Handle HTTP errors
            if (!res.ok) {
            const err = await res.json();
                throw new Error(err.error || 'Failed to save Relation');
            }

            // Updated card returned from server
            const updatedRelation: Relation = await res.json();

            setEditableRelation(updatedRelation);
            setCurrentRelation(updatedRelation);
            setAdminEditing(false);

        } catch (err) {
            console.error('Failed to save relation:', err);
            showAlert('Failed to save relation. Please try again.');
        }
    }
    
    return (
        <>
        <div className='panel'>
            <>
            {isAnimating && <div className="sparkleOverlay" />}
            <div className='panelTitle'>
                <button className='infoBtn' onClick={()=>setInfoModalOpen(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                <h2>Relations</h2>
            </div>
            <div className='relationCardIcons'>
                {
                firstCard === null ? (
                    <div className="relationCardWrapper">
                        <div className="cardEffectLayer">
                            {isAnimating && <Sparkles />}
                            <div className="cardBackOverlayWrapper">
                                <img
                                    src={`${selectedDeck?.images['card-back']}`}
                                    className="relationCardImg"
                                    alt={`Deck back`}
                                    onClick={() => {
                                        setModalCard(1)
                                        setModalOpen(true)
                                        setShowDescription(false);
                                    }}
                                />
                                <div className="cardBackText">
                                    Click to select card
                                </div>
                            </div>
                        </div>
                    </div>
                ):(
                    <div className="relationCardWrapper">
                        <div className="cardEffectLayer">
                            {isAnimating && <Sparkles />}
                            <img
                                src={`${selectedDeck?.images['card-front']}/${firstCard.type.replaceAll(" ", "")}/${firstCard.nameShort}.png`}
                                className="relationCardImg"
                                alt={`Deck card ${firstCard.name}`}
                                onClick={() => {
                                    setModalCard(1)
                                    setModalOpen(true)
                                }}
                            />
                        </div>
                    </div>
                )
                }
                <div className="centerPlusWrapper">
                    {isAnimating ? (
                        <div className="starLoader">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <svg
                            key={i}
                            viewBox="0 0 96 96"
                            className="loaderStar"
                            style={{ '--i': i } as React.CSSProperties}
                            >
                            <path
                                d="M93.781 51.578C95 50.969 96 49.359 96 48c0-1.375-1-2.969-2.219-3.578
                                0 0-22.868-1.514-31.781-10.422-8.915-8.91-10.438-31.781-10.438-31.781
                                C50.969 1 49.375 0 48 0s-2.969 1-3.594 2.219
                                c0 0-1.5 22.87-10.406 31.781-8.908 8.913-31.781 10.422-31.781 10.422
                                C1 45.031 0 46.625 0 48c0 1.359 1 2.969 2.219 3.578
                                0 0 22.873 1.51 31.781 10.422 8.906 8.911 10.406 31.781 10.406 31.781
                                C45.031 95 46.625 96 48 96s2.969-1 3.562-2.219
                                c0 0 1.523-22.871 10.438-31.781 8.913-8.908 31.781-10.422 31.781-10.422Z"
                                fill="currentColor"
                            />
                            </svg>
                        ))}
                        </div>
                    ) : (
                        <span className="centerPlus">+</span>
                    )}
                </div>

                {
                secondCard === null ? (
                    <div className="relationCardWrapper">
                        <div className="cardEffectLayer">
                            {isAnimating && <Sparkles />}
                            <div className="cardBackOverlayWrapper">
                                <img
                                    src={`${selectedDeck?.images['card-back']}`}
                                    className="relationCardImg"
                                    alt={`Deck back`}
                                    onClick={() => {
                                        setModalCard(2)
                                        setModalOpen(true)
                                    }}
                                />
                                <div className="cardBackText">
                                        Click to select card
                                </div>
                            </div>
                        </div>
                    </div>
                ):(
                    <div className="relationCardWrapper">
                        <div className="cardEffectLayer">
                            {isAnimating && <Sparkles />}
                            <img
                                src={`${selectedDeck?.images['card-front']}/${secondCard.type.replaceAll(" ", "")}/${secondCard.nameShort}.png`}
                                className="relationCardImg"
                                alt={`Deck card ${secondCard.name}`}
                                onClick={() => {
                                    setModalCard(2)
                                    setModalOpen(true)
                                }}
                            />
                        </div>
                    </div>
                )
                }
            </div>
            <button onClick={handleEnterClick}
                disabled={isAnimating} className='enterBtn'>Enter</button>
            {user?.type === "Admin" && currentRelation !== null && showDescription === true && (
                adminEditing === true ? (
                    <button className='enterBtn' onClick={()=>setAdminEditing(false)}>Cancel Edit</button>
                ):(
                    <button className='enterBtn' onClick={()=>setAdminEditing(true)}>Edit</button>
                )
            )}
            </>

            <>
            <div className="modal" ref={modalRef}>
                <div className="modal-content">
                    <span className="close" onClick={()=>setModalOpen(false)}>&times;</span>
                    <h2 className='modalPanelTitle'>Choose Card for Relation</h2>
                    <div className='modalOuterCards'>
                        {groupedCards.map((group) =>
                            group.cards.length > 0 ? (
                                <div key={group.suit} className='outerCardSuit'>
                                <h3 className="suitHeading">{group.suit}</h3>

                                <div className="modalOuterCardsGrid">
                                    {group.cards.map((card) => {
                                        return (
                                            <div className="modalCardFace" 
                                                onClick={()=>{
                                                    if(modalCard === 1){
                                                        setFirstCard(card);
                                                    }else if(modalCard === 2){
                                                        setSecondCard(card);
                                                    }
                                                }}
                                            >
                                                <div className='modalCardImgOuter'>
                                                    {width >= 400 && (
                                                        <div className='modalCardImgBorder'>
                                                            <img
                                                                src={`${selectedDeck?.images['card-back']}`}
                                                                className="modalCardImg"
                                                                alt={`Deck back`}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className='modalCardImgBorder'>
                                                        <img
                                                            src={`${selectedDeck?.images['card-front']}/${card?.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                                                            className="modalCardImg"
                                                            alt={`${card.name}`}
                                                        />
                                                    </div>
                                                </div>
                                                <h3 className="cardTitle">{card.name}</h3>
                                                <p className="cardDesc">
                                                    {card.value} – {card.type}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                                </div>
                            ) : null
                        )}
                    </div>
                </div>
            </div>
            <div className="modal" ref={infoModalRef}>
                <div className="modal-content">
                    <span className="close" onClick={()=>setInfoModalOpen(false)}>&times;</span>
                    <h2 className='modalPanelTitle'>Info</h2>
                    <div className='infoModals'>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Welcome to the Card Relations page! 
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            This is a mix and match type generator. Select any 2 different cards in the tarot deck, and see how they relate!
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Accurate readings of a combination will always depend on the querent's question and the other surrounding cards. These combinations show just some of the possible interpretations. Treat this as an educational tool!
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            All card combinations have a description, but some have multiple descriptions for different subject matter.
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            When a card slot is clicked, a selection window will appear where the card options are displayed in order by suit. Just click to select!
                        </p>
                        {user !== null ? (
                            <>
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                This page uses cards from the selected deck. 
                                The default selected deck is the Rider-Waite Deck. You are logged in, go to the decks page to select a different deck!
                            </p> 
                            </>
                        ):(
                            <>
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                This page uses cards from the selected deck. 
                                You are not logged in, so the selected deck will be the Rider-Waite Deck. Log in to select a different deck.
                            </p> 
                            </>
                        )}
                    </div>
                </div>
            </div>
            </>

            {currentRelation !== null && showDescription && firstCard !== null && secondCard !== null ? (
                <div className='cardDescription'>
                    {user?.type !== "Admin" || adminEditing === false ? (
                        <>
                        <h2 ref={headingRef}>{firstCard.name} & {secondCard.name}</h2>
                        <h3>Description</h3>
                        <p className='relationParagraph'>{currentRelation?.description}</p>
                        {currentRelation?.descriptionAdvice ? (
                            <>
                            <h3>Advice</h3>
                            <p>{currentRelation?.descriptionAdvice}</p>
                            </>
                        ):(
                            <div></div>
                        )}
                        {currentRelation?.descriptionLove ? (
                            <>
                            <h3>Love and Relationships</h3>
                            <p>{currentRelation?.descriptionLove}</p>
                            </>
                        ):(
                            <div></div>
                        )}
                        {currentRelation?.descriptionCareer ? (
                            <>
                            <h3>Career</h3>
                            <p>{currentRelation?.descriptionCareer}</p>
                            </>
                        ):(
                            <div></div>
                        )}
                        </>
                    ):(
                        <>
                        <h2 ref={headingRef}>{firstCard.name} & {secondCard.name}</h2>
                        <h3>Description</h3>
                        <div className='cardEditInput'>
                            <label>General: </label>
                            <textarea ref={(el) => autoResize(el)} value={editableRelation?.description} onChange={(e) => {
                                if (!editableRelation) return;

                                setEditableRelation({
                                ...editableRelation,
                                description: e.target.value,
                                });
                            }}></textarea>
                        </div>
                        <div className='cardEditInput'>
                            <label>Advice: </label>
                            <textarea ref={(el) => autoResize(el)} value={editableRelation?.descriptionAdvice} onChange={(e) => {
                                if (!editableRelation) return;

                                setEditableRelation({
                                ...editableRelation,
                                descriptionAdvice: e.target.value,
                                });
                            }}></textarea>
                        </div>
                        <div className='cardEditInput'>
                            <label>Love and Relationships</label>
                            <textarea ref={(el) => autoResize(el)} value={editableRelation?.descriptionLove} onChange={(e) => {
                                if (!editableRelation) return;

                                setEditableRelation({
                                ...editableRelation,
                                descriptionLove: e.target.value,
                                });
                            }}></textarea>
                        </div>
                        <div className='cardEditInput'>
                            <label>Career</label>
                            <textarea ref={(el) => autoResize(el)} value={editableRelation?.descriptionCareer} onChange={(e) => {
                                if (!editableRelation) return;

                                setEditableRelation({
                                ...editableRelation,
                                descriptionCareer: e.target.value,
                                });
                            }}></textarea>
                        </div>
                        <button className='enterBtn' onClick={()=>handleSaveEdits()}>Save Edits</button>
                        </>
                    )}
                </div>
            ):(
                <div></div>
            )}
        </div>
        </>
    )
}

/*id                String   @id @default(uuid())
  cards             String[] //list of card ids that are related
  description       String //explanation of relation
  descriptionAdvice String
  descriptionLove   String
  descriptionCareer String*/

export default RelationsPanel