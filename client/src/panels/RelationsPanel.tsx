import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './RelationsPanel.css'
import './CardsPanel.css'
import type { User, Deck, Relation, Card, Suit } from '../types'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faCirclePlus } from '@fortawesome/free-solid-svg-icons';
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'
import SelectCardPage from '../components/SelectCardPage'
import type { TocItem } from '../components/TableOfContents'
import TableOfContents from '../components/TableOfContents'
import CardSelect from '../components/CardSelect'

function buildRelationToc(relation: Relation | null): TocItem[] {
  if (!relation) {
    return []
  }

  const items: TocItem[] = [
    {
      label: 'Description',
      targetId: 'relationDescriptionSection',
    },
  ]

  if (relation.descriptionAdvice) {
    items.push({ label: 'Advice', targetId: 'relationAdviceSection' })
  }
  if (relation.descriptionLove) {
    items.push({ label: 'Love and Relationships', targetId: 'relationLoveSection' })
  }
  if (relation.descriptionCareer) {
    items.push({ label: 'Career', targetId: 'relationCareerSection' })
  }

  return items
}

interface RelationsPanelProps {
    user: User | null
    selectedDeck: Deck | null
    cards: Card[]
    showAlert: (msg: string) => void
    token: string | null
    Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
}


function RelationsPanel({ user, selectedDeck, cards, showAlert, token, Icon}: RelationsPanelProps) {
    const [firstCard, setFirstCard] = useState<Card | null>(null);
    const [secondCard, setSecondCard] = useState<Card | null>(null);
    const [showDescription, setShowDescription] = useState(false);
    const [currentRelation, setCurrentRelation] = useState<Relation | null>(null);
    const [isAnimating, setIsAnimating] = useState(false)
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    const navigate = useNavigate();
    const [adminEditing, setAdminEditing] = useState<boolean>(false);

    const [editableRelation, setEditableRelation] = useState<Relation | null>(null);
    
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
    const [showCardSelectModal, setShowCardSelectModal] = useState<{show: boolean, index: number}>({show: false, index: 0});
    const { nameShort1, nameShort2 } = useParams();
    const location = useLocation();

    useEffect(() => {
        if (cards.length === 0) return;

        let card1: Card | null = null;
        let card2: Card | null = null;

        if (nameShort1 && nameShort1 !== 'none') {
            card1 = cards.find(c => c.nameShort === nameShort1) || null;
        }

        if (nameShort2) {
            card2 = cards.find(c => c.nameShort === nameShort2) || null;
        }

        setFirstCard(card1);
        setSecondCard(card2);
    }, [cards, nameShort1, nameShort2]);

    // Writes a card selection into the URL. Deliberately called directly
    // from the two places the user actually picks a card (below), rather
    // than from an effect reacting to firstCard/secondCard changes — that
    // state also changes when the effect above hydrates it FROM the URL on
    // mount, and there's no reliable way to tell the two cases apart from
    // inside a passive effect (React StrictMode's double-invoke of effects
    // on mount makes a one-shot "skip on mount" guard unreliable here: the
    // guard is consumed by the first invocation, so the second invocation
    // — still reading the pre-update null/null closure, since no real
    // render happens between the two synthetic invocations — fires the
    // premature navigate anyway).
    const navigateToCardSelection = (card1: Card | null, card2: Card | null) => {
        let path = '/relations';
        if (card1 && card2) {
            path = `/relations/${card1.nameShort}/${card2.nameShort}`;
        } else if (card1) {
            path = `/relations/${card1.nameShort}`;
        } else if (card2) {
            path = `/relations/none/${card2.nameShort}`;
        }

        if (location.pathname !== path) {
            navigate(path, { replace: true });
        }
    };

    const handleSelectFirstCard = (card: Card | null) => {
        setFirstCard(card);
        navigateToCardSelection(card, secondCard);
    };

    const handleSelectSecondCard = (card: Card | null) => {
        setSecondCard(card);
        navigateToCardSelection(firstCard, card);
    };


    useEffect(() => {
        setShowCardSelectModal({show: false, index: 0});
    }, [firstCard, secondCard]);

    useEffect(() => {
        setShowDescription(false);
        setCurrentRelation(null); // optional, forces new fetch if needed
    }, [firstCard, secondCard]);

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
                <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                <h2>Relations</h2>
                <span className='infoBtn' style={{backgroundColor: "transparent"}}></span>
            </div>
            <div className='innerCardImgs relationCardRow'>
                <CardSelect isAnimating={isAnimating} onSelect={() => {
                        setShowCardSelectModal({show: true, index: 1});
                        setShowDescription(false);
                    }} Icon={Icon} selectedCard={firstCard} selectedDeck={selectedDeck!} reversals={false} allowSetReversals={true}/>
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
                        <span className="centerPlus"><FontAwesomeIcon icon={faCirclePlus}></FontAwesomeIcon></span>
                    )}
                </div>
                <CardSelect isAnimating={isAnimating} onSelect={() => {
                        setShowCardSelectModal({show: true, index: 2});
                    }} Icon={Icon} selectedCard={secondCard} selectedDeck={selectedDeck!} reversals={false} allowSetReversals={true}/>
            </div>
            <div className='outerEditBtn'>
                <button onClick={handleEnterClick}
                disabled={isAnimating} className='backBtn'>Enter</button>
            </div>
            {user?.type === "Admin" && currentRelation !== null && showDescription === true && (
                adminEditing === true ? (
                    <button className='enterBtn' onClick={()=>setAdminEditing(false)}>Cancel Edit</button>
                ):(
                    <button className='enterBtn' onClick={()=>setAdminEditing(true)}>Edit</button>
                )
            )}
            </>

            <>
            <Modal title={`Choose Card ${showCardSelectModal.index} for Relation`} showModal={showCardSelectModal.show} setShowModal={(show) => setShowCardSelectModal({show, index: showCardSelectModal.index})}>
                {showCardSelectModal.index === 1 ? (
                    <SelectCardPage
                        showModal={showCardSelectModal.show}
                        groupedCards={groupedCards}
                        setCard={handleSelectFirstCard}
                        selectedDeck={selectedDeck!}
                        selectedCard={firstCard}
                    />
                ):(
                    <SelectCardPage
                        showModal={showCardSelectModal.show}
                        groupedCards={groupedCards}
                        setCard={handleSelectSecondCard}
                        selectedDeck={selectedDeck!}
                        selectedCard={secondCard}
                    />
                )}
            </Modal>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Card Relations page!`,
                    `This is a mix-and-match generator. Select any 2 different cards to see how they relate.`,
                    `A combination's true meaning always depends on the querent's question and the surrounding cards. Treat these as an educational tool, not a definitive reading.`,
                    `Every combination has a description, and some have multiple descriptions for different subject matter.`,
                    `Click a card slot to open a selection window with all cards listed by suit.`,
                    `This page uses cards from your selected deck. The default is the Rider-Waite Deck.`,
                    user === null
                        ? `You're not logged in, so you'll need to log in to select a different deck.`
                        : `You're logged in, so go to the Decks page to select a different deck.`
                ]} />
            </Modal>
            </>

            {currentRelation !== null && showDescription && firstCard !== null && secondCard !== null ? (
                <div className='cardDescription'>
                    {user?.type !== "Admin" || adminEditing === false ? (
                        <>
                        <h2 className="cardDescTitle" ref={headingRef}>{firstCard.name} & {secondCard.name}</h2>
                        <TableOfContents items={buildRelationToc(currentRelation)} />
                        <h3 id="relationDescriptionSection" className="sectionHeading">Description</h3>
                        <p className='relationParagraph'>{currentRelation?.description}</p>
                        {currentRelation?.descriptionAdvice ? (
                            <>
                            <h3 id="relationAdviceSection" className="sectionHeading">Advice</h3>
                            <p className='relationParagraph'>{currentRelation?.descriptionAdvice}</p>
                            </>
                        ):(
                            <div></div>
                        )}
                        {currentRelation?.descriptionLove ? (
                            <>
                            <h3 id="relationLoveSection" className="sectionHeading">Love and Relationships</h3>
                            <p className='relationParagraph'>{currentRelation?.descriptionLove}</p>
                            </>
                        ):(
                            <div></div>
                        )}
                        {currentRelation?.descriptionCareer ? (
                            <>
                            <h3 id="relationCareerSection" className="sectionHeading">Career</h3>
                            <p className='relationParagraph'>{currentRelation?.descriptionCareer}</p>
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