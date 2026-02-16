import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './ReadingsPanel.css'
import './RelationsPanel.css'
import Sparkles from '../components/Sparkles'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import type { User, Reading, Deck, Relation, Spread, Card, Topic, DrawingMethod, Suit } from '../types'
import html2pdf from 'html2pdf.js';
import { useNavigate } from 'react-router-dom'

interface ReadingsPanelProps {
    user: User | null
    selectedDeck: Deck | null
    width: number
    showAlert: (msg: string) => void
}

function ReadingsPanel({ user, selectedDeck, width, showAlert }: ReadingsPanelProps) {
    const [cards, setCards] = useState<Card[]>([]);
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const [drawingMethod, setDrawingMethod] = useState<DrawingMethod>('Manual');
    const [selectedSpreadId, setSelectedSpreadId] = useState<string | null>(null);
    const [selectedCards, setSelectedCards] = useState<(Card | undefined)[]>([]);
    const [reversals, setReversals] = useState<boolean>(false);
    const [reversalValues, setReversalValues] = useState<boolean[]>([]);
    const [relations, setRelations] = useState<Relation[]>([]);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [modalCard, setModalCard] = useState<number>(0);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const [showDescription, setShowDescription] = useState(false);
    const [topic, setTopic] = useState<Topic>('General');
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    const spread = spreads.find(s => s.id === selectedSpreadId) ?? null;
    const [createdReading, setCreatedReading] = useState<Reading | null>(null);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);
    const [readingName, setReadingName] = useState<string>("");
    const pdfRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate()
    const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
    const infoModalRef = useRef<HTMLDivElement | null>(null);


    // Load all cards
    useEffect(() => {
        fetch('/api/cards')
        .then(res => res.json())
        .then((data: Card[]) => setCards(data))
        .catch(err => console.error('Failed to fetch cards:', err))
    }, [])
    
    useEffect(() => {
        fetch('/api/spreads')
        .then(res => res.json())
        .then((data: Spread[]) => {
        setSpreads(data);
        if (data.length > 0) {
            setSelectedSpreadId(data[0].id);
        }
        });
    }, []);

    useEffect(() => {
        const s = spreads.find(sp => sp.id === selectedSpreadId);
        if (s) {
            setSelectedCards(Array(s.numPulls).fill(undefined));
        }
    }, [selectedSpreadId, spreads]);

    useEffect(() => {
        setShowDescription(false);
        setCreatedReading(null);
    }, [selectedSpreadId, drawingMethod]);

    useEffect(() => {
        if (showDescription && headingRef.current !== null) {
            headingRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, [showDescription]);


    useEffect(() => {
        if(modalRef.current === null){
            return;
        }
        if(modalOpen === true){
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
            infoModalRef.current.style.display = "flex";
        }else if(infoModalOpen === false){
            infoModalRef.current.style.display = "none";
        }
    }, [infoModalOpen]);

    useEffect(() => {
        if(reversals === false){
            setReversalValues([]);
        }
    }, [reversals]);

    const hasDuplicateCards = (cards: Card[]) => {
        const ids = cards.map(c => c.id);
        return new Set(ids).size !== ids.length;
    };


    const handleEnterClick = async () => {
        let finalCards = selectedCards;
        let finalReversalValues = reversalValues;

        // =============================
        // Virtual draw
        // =============================
        if (drawingMethod === "Virtual") {
            const res = await fetch(
            `/api/cards/draw/${spread?.numPulls}/${reversals}`
            );
            const data = await res.json();

            finalCards = data.cards.map(
            (id: string) => cards.find(c => c.id === id)!
            );

            setSelectedCards(finalCards);

            if (reversals) {
            finalReversalValues = data.reversed ?? [];
            setReversalValues(finalReversalValues);
            }
        }

        // =============================
        // Validation
        // =============================
        if (
            drawingMethod === "Manual" &&
            finalCards.some(c => !c)
        ) {
            showAlert(
            "Please select all cards for the manual reading. Switch to virtual to have the cards drawn for you."
            );
            return;
        }

        const safeFinalCards: Card[] =
            finalCards.filter((c): c is Card => !!c);

        if (hasDuplicateCards(safeFinalCards)) {
            showAlert("No duplicates allowed in a reading.");
            return;
        }

        // =============================
        // DO NOT TOUCH ANIMATION LOGIC
        // =============================
        setIsAnimating(true);

        // =============================
        // Fetch relations (if needed)
        // =============================
        let relationData:any = {};

        if (safeFinalCards.length > 1) {
            const res = await fetch('/api/relations/nCardRelations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardIds: safeFinalCards.map(card => card.id),
            }),
            });

            const data = await res.json();
            relationData = data.relations;
            setRelations(relationData);
        }

        // =============================
        // Build base reading (local)
        // =============================
        let created: Reading = {
            id: "r0",
            date: String(new Date()),
            cards: safeFinalCards.map(card => card.id),
            reversals,
            reversalValues: finalReversalValues,
            spread: spread?.id,
            topic,
            relations: relationData.relationIds,
        } as Reading;

        // =============================
        // Save to backend (if logged in)
        // =============================
        if (user && spread) {
            const sanitizedReversalValues =
            safeFinalCards.map((_, i) => finalReversalValues[i] ?? false);

            const res = await fetch('/api/readings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: new Date().toISOString(),
                userId: user.id,
                ...(readingName ? { name: readingName } : {}),
                spreadId: spread.id,
                reversals,
                topic,
                cardIds: safeFinalCards.map(card => card.id),
                reversalValues: reversals ? sanitizedReversalValues : [],
            }),
            });

            if (!res.ok) {
            const err = await res.json();
            console.error('Failed to create reading:', err);
            } else {
            const savedReading = await res.json();

            // overwrite with real DB values
            created = {
                ...created,
                id: savedReading.id,
                date: savedReading.date,
            };
            }
        }

        // =============================
        // Set reading once
        // =============================
        setCreatedReading(created);

        // =============================
        // DO NOT TOUCH ANIMATION LOGIC
        // =============================
        setTimeout(() => {
            setIsAnimating(false);
            setShowDescription(true);
        }, 3000);
        };


    const handleDownloadPDF = () => {
        if (!pdfRef.current) return;

        const opt = {
            margin:       0.5,
            filename:     `${readingName || 'tarot-reading'}.pdf`,
            image: { type: "jpeg" as const, quality: 0.98 },
            html2canvas:  {
            scale: 2,
            useCORS: true, // important for card images
            },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
        };

        html2pdf().set(opt).from(pdfRef.current).save();
    };

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


    return (
        <>
            <div className='panel'>
                {isAnimating && <div className="sparkleOverlay" />}
                <div className='panelTitle'>
                    <button className='infoBtn' onClick={()=>setInfoModalOpen(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    <h2>Readings</h2>
                </div>
                <div className='readingsForm'>
                    <div className='topForm'>
                    {user !== null && (
                        <div className='readingsInputOuter'>
                            <label htmlFor="name-input">Reading Name: </label>
                            <input id="name-input" type="text" onChange={(e) => setReadingName(e.target.value)} value={readingName} >
                            </input>
                        </div>
                    )}
                    <div className='readingsInputOuter'>
                        <label htmlFor='drawing-select'>Drawing Method: </label>
                        <select id="drawing-select" onChange={(e) => {
                            if (['Manual', 'Virtual'].includes(e.target.value as DrawingMethod)) {
                                setDrawingMethod(e.target.value as DrawingMethod);
                            }
                        }} value={drawingMethod}>
                            <option>Manual</option>
                            <option>Virtual</option>
                        </select>
                    </div>
                    <div className='readingsInputOuter'>
                        <label htmlFor="spread-select">Spread: </label>
                        <select
                            id="spread-select"
                            value={selectedSpreadId ?? ''}
                            onChange={(e) => setSelectedSpreadId(e.target.value)}
                            >
                            {spreads.map((spread) => (
                                <option key={spread.id} value={spread.id}>
                                {spread.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className='readingsInputOuter'>
                        <label htmlFor="topic-select">Topic: </label>
                        <select
                            id="topic-select"
                            value={topic ?? ''}
                            onChange={(e) => {
                                if (["General", "Advice", "Love & Relationships", "Career"].includes(e.target.value as Topic)) {
                                    setTopic(e.target.value as Topic);
                                }
                            }}
                            >
                            <option>General</option>
                            <option>Advice</option>
                            <option>Love & Relationships</option>
                            <option>Career</option>
                        </select>
                    </div>
                    </div>
                    <div className='readingsCheckboxOuter'>
                        <input
                            id="reversals-checkbox"
                            type="checkbox"
                            checked={reversals}
                            onChange={(e) => setReversals(e.target.checked)}
                        />
                        <label htmlFor="reversals-checkbox">Allow Reversals</label>
                    </div>
                    {drawingMethod === 'Manual' && spread && (
                        <div className='readingsInputOuter'>
                            <div className='readingsCards'>
                            {Array.from({ length: spread.numPulls }).map((_, i) => (
                                <>
                                <div className='checkReadingCardWrapper'>
                                    <div className="cardEffectLayer">
                                    {isAnimating && <Sparkles />}
                                    <div className="readingCardWrapper" key={i} 
                                    onClick={()=>{
                                        setModalOpen(true);
                                        setModalCard(i);
                                    }
                                    }
                                    >
                                        {selectedCards[i] ? (
                                            <img
                                                src={`${selectedDeck?.images['card-front']}/${selectedCards[i].type.replaceAll(" ", "")}/${selectedCards[i].nameShort}.png`}
                                                className={reversalValues[i] === true ? "readingCardImg upside-down" : "readingCardImg"}
                                                alt={`Deck card ${selectedCards[i].name}`}
                                            />
                                        ) : (
                                            <div className="cardBackOverlayWrapper">
                                                    <img
                                                        src={selectedDeck?.images['card-back']}
                                                        className="readingCardImg"
                                                        alt="Deck back"
                                                    />
                                                    <div className="cardBackText">
                                                        Click to select card
                                                    </div>
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                    {
                                        reversals === true && (
                                            <div className='reversedInput'>
                                                <input
                                                    id="reversedCardCheckbox"
                                                    type="checkbox"
                                                    checked={reversalValues[i]}
                                                    onChange={(e) => {
                                                        let newRevVals = [...reversalValues];
                                                        newRevVals[i] = e.target.checked;
                                                        setReversalValues(newRevVals);
                                                    }
                                                    }
                                                />
                                                {width >= 400 && (
                                                    <label htmlFor="reversedCardCheckbox">Reversed</label>
                                                )}
                                                {width < 400 && (
                                                    <label htmlFor="reversedCardCheckbox">Rev</label>
                                                )}
                                            </div>
                                        )
                                    }
                                </div>
                                </>
                            ))}
                            </div>
                        </div>
                    )}
                    {drawingMethod === 'Virtual' && spread && (
                        <div className='readingsInputOuter'>
                            <div className='readingsCards'>
                            {Array.from({ length: spread.numPulls }).map((_, i) => (
                                <>
                                <div className='checkReadingCardWrapper'>
                                    {isAnimating && <Sparkles />}
                                    <div className="readingCardWrapper" key={i} 
                                    >
                                        {selectedCards[i] ? (
                                            <img
                                                src={`${selectedDeck?.images['card-front']}/${selectedCards[i]?.type.replaceAll(" ", "")}/${selectedCards[i]?.nameShort}.png`}
                                                className={reversalValues[i] === true ? "readingCardImg upside-down" : "readingCardImg"}
                                                alt={`Deck card ${selectedCards[i]?.name}`}
                                            />
                                        ) : (
                                            <img
                                                src={selectedDeck?.images['card-back']}
                                                className="readingCardImg noclick"
                                                alt="Deck back"
                                            />
                                        )}
                                    </div>
                                </div>
                                </>
                            ))}
                            </div>
                        </div>
                    )}
                    <button className='getReadingBtn' onClick={handleEnterClick}
                        disabled={isAnimating}>Get Reading</button>
                    {createdReading !== null && showDescription && (
                        <>
                        <div className='outerReading' ref={pdfRef}>
                            <div className='topReadingOuter'>
                            <h2 ref={headingRef}>Your Reading: </h2>
                            {user !== null && (
                                <button className='getReadingBtn' onClick={() => navigate(`/readings/${createdReading.id}`)}>Go to Full Reading</button>
                            )}
                            <div>
                                <h3 className='tableContentsTitle'>Table of Contents</h3>
                                <ul className='tableOfContents'>
                                    {selectedCards.map((card, i) => {
                                        if (!card) return null;

                                        const hasTopicMeaning =
                                            (topic === 'Advice' && card.meaningAdvice) ||
                                            (topic === 'Love & Relationships' && card.meaningLove) ||
                                            (topic === 'Career' && card.meaningCareer);

                                        return (
                                            <>
                                            <li onClick={()=>{ 
                                                let el = document.getElementById(`cardTitle${i}`);
                                                if(el !== null){
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                }
                                            }}>
                                                {spread?.pulls[i]}: {card.name}
                                            </li>
                                                <ul>
                                                    <li onClick={()=>{ 
                                                        let el = document.getElementById(`cardDesc${i}`);
                                                        if(el !== null){
                                                            el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                        }
                                                    }}>
                                                        Description
                                                    </li>
                                                    {reversals === true && reversalValues[i] === true ? (
                                                        <li onClick={()=>{ 
                                                            let el = document.getElementById(`cardMeaning${i}`);
                                                            if(el !== null){
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                            }
                                                        }}>Meaning (Reversed)</li>
                                                    ):(
                                                        <li onClick={()=>{ 
                                                            let el = document.getElementById(`cardMeaning${i}`);
                                                            if(el !== null){
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                            }
                                                        }}>Meaning (Upright)</li>
                                                    )}
                                                    {topic !== 'General' && hasTopicMeaning &&  (
                                                        <>
                                                            <li onClick={()=>{ 
                                                                let el = document.getElementById(`cardSpecMeaning${i}`);
                                                                if(el !== null){
                                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                                }
                                                            }}>Meaning for {topic}</li>
                                                        </>
                                                    )}
                                                    {
                                                        spread !== null && spread.name === 'Yes or No' && (
                                                            <li onClick={()=>{ 
                                                                let el = document.getElementById(`cardYesNo`);
                                                                if(el !== null){
                                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                                }
                                                            }}>Finally: Yes or No?</li>
                                                        )
                                                    }
                                                </ul>
                                            </>
                                        );
                                    })}
                                    {spread !== null && spread.numPulls > 1 && (
                                        <>
                                        <li onClick={()=>{ 
                                            let el = document.getElementById('combined');
                                            if(el !== null){
                                                el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                            }
                                        }}>
                                            Combined
                                        </li>
                                            <ul>
                                                {relations.map((relation, rIdx) => {
                                                    const cardNames = relation.cards
                                                        .map(cardId => cards.find(c => c.id === cardId)?.name ?? 'Unknown card')
                                                        .join(' & ');

                                                    const hasTopicDescription =
                                                        (topic === 'Advice' && relation.descriptionAdvice) ||
                                                        (topic === 'Love & Relationships' && relation.descriptionLove) ||
                                                        (topic === 'Career' && relation.descriptionCareer);

                                                    return (
                                                        <>
                                                        <li onClick={()=>{ 
                                                            let el = document.getElementById(`relationName${rIdx}`);
                                                            if(el !== null){
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                            }
                                                        }}>{cardNames}</li>
                                                        <ul>
                                                        {topic !== 'General' && hasTopicDescription && (
                                                            <li onClick={()=>{ 
                                                                let el = document.getElementById(`relationSpecMeaning${rIdx}`);
                                                                if(el !== null){
                                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                                }
                                                            }}>
                                                                {cardNames} in {topic}
                                                            </li>
                                                        )}
                                                        </ul>
                                                        </>
                                                    );
                                                })}
                                            </ul>
                                        </>
                                    )}
                                </ul>
                            </div>
                            </div>
                            {selectedCards.map((card, i) => {
                                if (!card) return null;

                                return (
                                    <div key={i} className="readingResultCard">
                                        <h3 id={`cardTitle${i}`}>
                                            {spread?.pulls[i]}: {card.name}
                                        </h3>

                                        <h4 id={`cardDesc${i}`}>Description</h4>
                                        <p className='readingParagraph'>{card.descriptions[selectedDeck!.id]}</p>

                                        {reversals && reversalValues[i] ? (
                                            <>
                                                <h4 id={`cardMeaning${i}`}>Meaning (Reversed)</h4>
                                                <p className='readingParagraph'>{card.meaningRev}</p>
                                            </>
                                        ) : (
                                            <>
                                                <h4 id={`cardMeaning${i}`}>Meaning (Upright)</h4>
                                                <p className='readingParagraph'>{card.meaningUp}</p>
                                            </>
                                        )}

                                        {topic !== 'General' && (
                                            <>
                                                <h4 id={`cardSpecMeaning${i}`}>Meaning for {topic}</h4>
                                                {reversals === true && reversalValues[i] === true && (
                                                    <>
                                                        <p>Remember: This card is reversed! Negate the following meaning.</p>
                                                    </>
                                                )}
                                                {topic === 'Advice' && <p className='readingParagraph'>{card.meaningAdvice}</p>}
                                                {topic === 'Love & Relationships' && <p className='readingParagraph'>{card.meaningLove}</p>}
                                                {topic === 'Career' && <p className='readingParagraph'>{card.meaningCareer}</p>}
                                            </>
                                        )}

                                        {spread?.name === 'Yes or No' && (
                                            <>
                                                <h4 id={`cardYesNo`}>Finally: Yes or No?</h4>
                                                {reversals === true && reversalValues[i] === true && (
                                                    <>
                                                        <p>Remember: This card is reversed! Negate the following meaning.</p>
                                                    </>
                                                )}
                                                <p className='readingParagraph'>{card.meaningYesNo}</p>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            {spread !== null && spread.numPulls > 1 && (
                            <>
                                <h3 id={`combined`}>Combined</h3>

                                {relations.map((relation, rIdx) => (
                                    <div key={rIdx} className="combinedRelation">
                                        <h4 id={`relationName${rIdx}`}>
                                            {relation.cards
                                                .map(cardId => {
                                                    const card = cards.find(c => c.id === cardId);
                                                    return card ? card.name : 'Unknown card';
                                                })
                                                .join(' & ')
                                            }
                                        </h4>
                                        <p className='readingParagraph'>{relation.description}</p>
                                        {topic !== 'General' && ((topic === 'Advice' && relation.descriptionAdvice) ||
                                            (topic === 'Love & Relationships' && relation.descriptionLove) ||
                                            (topic === 'Career' && relation.descriptionCareer)) && (
                                            <>
                                            <h4 id={`relationSpecMeaning${rIdx}`}>
                                                {relation.cards
                                                    .map(cardId => {
                                                        const card = cards.find(c => c.id === cardId);
                                                        return card ? card.name : 'Unknown card';
                                                    })
                                                    .join(' & ')
                                                } in {topic}
                                            </h4>
                                            {topic === "Advice" && relation.descriptionAdvice !== "" ? (
                                                <p className='readingParagraph'>{relation.descriptionAdvice}</p>
                                            ) : topic === "Love & Relationships" && relation.descriptionLove !== "" ? (
                                                <p className='readingParagraph'>{relation.descriptionLove}</p>
                                            ) : topic === "Career" && relation.descriptionCareer !== "" ? (
                                                <p className='readingParagraph'>{relation.descriptionCareer}</p>
                                            ): (<p></p>)}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                        </div>
                        <button onClick={handleDownloadPDF} className='loginBtn'>Download</button>
                        </>
                    )}
                </div>
            </div>
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
                                                    let newC = [...selectedCards];
                                                    newC[modalCard] = card;
                                                    setSelectedCards(newC);
                                                    setModalOpen(false);
                                                }}
                                            >
                                                <div className='modalCardImgOuter'>
                                                    <div className='modalCardImgBorder'>
                                                        <img
                                                            src={`${selectedDeck?.images['card-front']}/${card?.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                                                            className="modalCardImg"
                                                            alt={`${card.name}`}
                                                        />
                                                    </div>
                                                    {width >= 400 && (
                                                        <div className='modalCardImgBorder'>
                                                            <img
                                                                src={`${selectedDeck?.images['card-back']}`}
                                                                className="modalCardImg"
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
                            Welcome to the Readings Page! 
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Manual drawings allow you to draw cards physically, and select the cards here for the reading. Virtual drawings generate cards randomly for you!
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Choose a reading spread using the select. Go to the Spreads page to learn more about the different spread options!
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Cards can have different meanings if reversed. Choose whether reversals are allowed in this reading using the checkbox.
                        </p>

                        {user !== null ? (
                            <>
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                You're logged in! Any readings you create here will be automatically saved to your account!
                            </p> 
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                Click download at the bottom of your reading to download as a pdf!
                            </p> 
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                This reading uses cards from the currently selected deck.
                                The default selected deck is the Rider-Waite Deck. You are logged in, go to the Decks page to select a different deck.
                            </p> 
                            </>
                        ):(
                            <>
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                Anyone can create new readings and download them as PDFs, but only logged in users can save them to their account! You are not logged in. Go log in to save and view your readings!
                            </p> 
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                This reading uses cards from the currently selected deck.
                                You are not logged in, so the selected deck will be the Rider-Waite Deck. Log in and head to the Decks page to select a different deck.
                            </p> 
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default ReadingsPanel