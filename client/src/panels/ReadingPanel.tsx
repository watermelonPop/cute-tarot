import { useState, useEffect } from 'react'
import '../App.css'
import './panel.css'
import type { User, Reading, Deck, Relation, Spread, Card } from '../types'
import { useParams } from 'react-router-dom'

interface ReadingPanelProps {
  user: User | null
  selectedDeck: Deck | null
  showAlert: (msg: string) => void
}

function ReadingPanel({ user, selectedDeck, showAlert }: ReadingPanelProps) {
    const [reading, setReading] = useState<Reading | null>(null);
    const [relations, setRelations] = useState<Relation[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const [editingNotes, setEditingNotes] = useState<boolean>(false);
    const [editedNotes, setEditedNotes] = useState<string>("");
    const { readingId } = useParams()
    

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
        .then((data: Spread[]) => setSpreads(data))
        .catch(err => console.error('Failed to fetch spreads:', err))
    }, [])

    useEffect(() => {
        fetch('/api/relations')
        .then(res => res.json())
        .then((data: Relation[]) => setRelations(data))
        .catch(err => console.error('Failed to fetch relations:', err))
    }, [])

    useEffect(() => {
        fetch(`/api/readings/${readingId}`)
        .then(res => res.json())
        .then((data: Reading) => {
            setReading(data);
            if(data?.notes){
                setEditedNotes(data.notes);
            }
        })
        .catch(err => console.error('Failed to fetch reading:', err))
    }, [])

    const handleSaveNotes = async (newNotes: string) => {
        try {
            const res = await fetch(`/api/readings/${readingId}/updateNotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notes: newNotes,
            }),
            });

            // Handle HTTP errors
            if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to save notes');
            }

            // Updated reading returned from server
            const updatedReading: Reading = await res.json();

            // Update local state
            setReading(updatedReading);
            setEditingNotes(false);

        } catch (err) {
            console.error('Failed to save notes:', err);
            showAlert('Failed to save notes. Please try again.');
        }
    };


    const spread = spreads.find(s => s.id === reading?.spread);

    return (
        <>
        <div className='panel'>
           {reading !== null &&  user !== null && (
                <div className='outerReading'>
                    <div className='topInnerReadingOuter'>
                    <div className='cardImgs'>
                        {reading.cards.map((cardId, idx) => {
                            const card = cards.find(c => c.id === cardId);

                            if (!card) return null;

                            return (
                                <div key={cardId} className='cardImgInnerBorder'>
                                    <img
                                    src={`${selectedDeck?.images['card-front']}/${card.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                                    className={reading.reversalValues[idx] === true ? "innerSpreadImg upside-down" : "innerSpreadImg"}
                                    alt={`Deck card ${card.name}`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <h2 className='readingPanelTitle'>Your Reading: {reading.name}</h2>
                    <div>
                        <h3 className='tableContentsTitle'>Table of Contents</h3>
                        <ul className='tableOfContents'>
                            {reading.cards.length > 0 && reading?.cards.map((cardId, i) => {
                                if (!cardId) return null;

                                const card = cards.find(c => c.id === cardId);
                                const spread = spreads.find(s => s.id === reading.spread);

                                // if card or spread is missing, skip rendering this card
                                if (!card || !spread) return null;

                                const hasTopicMeaning =
                                    (reading.topic === 'Advice' && card.meaningAdvice) ||
                                    (reading.topic === 'Love & Relationships' && card.meaningLove) ||
                                    (reading.topic === 'Career' && card.meaningCareer);

                                return (
                                    <>
                                    <li onClick={()=>{ 
                                        let el = document.getElementById(`cardTitle${i}`);
                                        if(el !== null){
                                            el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                        }
                                    }}>
                                        {spread.pulls[i]}: {card.name}
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
                                            {reading.reversals === true && reading.reversalValues[i] === true ? (
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
                                            {reading.topic !== 'General' && hasTopicMeaning &&  (
                                                <>
                                                    <li onClick={()=>{ 
                                                        let el = document.getElementById(`cardSpecMeaning${i}`);
                                                        if(el !== null){
                                                            el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                        }
                                                    }}>Meaning for {reading.topic}</li>
                                                </>
                                            )}
                                            {
                                                spread.name === 'Yes or No' && (
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
                            {reading !== null && spread && spread?.numPulls > 1 && (
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
                                        {reading.relations.length > 0 && reading.relations.map((relationId, rIdx) => {
                                            const relation = relations.find(r => r.id === relationId);
                                            if (!relation) return null;

                                            const cardNames = relation?.cards
                                                .map(cardId => cards.find(c => c.id === cardId)?.name ?? 'Unknown card')
                                                .join(' & ');

                                            const hasTopicDescription =
                                                (reading.topic === 'Advice' && relation.descriptionAdvice) ||
                                                (reading.topic === 'Love & Relationships' && relation.descriptionLove) ||
                                                (reading.topic === 'Career' && relation.descriptionCareer);

                                            return (
                                                <>
                                                <li onClick={()=>{ 
                                                    let el = document.getElementById(`relationName${rIdx}`);
                                                    if(el !== null){
                                                        el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                    }
                                                }}>{cardNames}</li>
                                                <ul>
                                                {reading.topic !== 'General' && hasTopicDescription && (
                                                    <li onClick={()=>{ 
                                                        let el = document.getElementById(`relationSpecMeaning${rIdx}`);
                                                        if(el !== null){
                                                            el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                                        }
                                                    }}>
                                                        {cardNames} in {reading.topic}
                                                    </li>
                                                )}
                                                </ul>
                                                </>
                                            );
                                        })}
                                    </ul>
                                </>
                            )}
                            {reading !== null && (
                                <li onClick={()=>{ 
                                    let el = document.getElementById('notes');
                                    if(el !== null){
                                        el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
                                    }
                                }}>
                                    Notes
                                </li>
                            )}
                        </ul>
                    </div>
                    </div>
                    {reading.cards.map((cardId, i) => {
                        if (!cardId) return null;

                        const card = cards.find(c => c.id === cardId);
                        const spread = spreads.find(s => s.id === reading.spread);

                        if(!card || !spread) return;

                        return (
                            <div key={i} className="readingResultCard">
                                <h3 id={`cardTitle${i}`}>
                                    {spread.pulls[i]}: {card.name}
                                </h3>

                                <h4 id={`cardDesc${i}`}>Description</h4>
                                <p className='readingParagraph'>{card.descriptions[selectedDeck!.id]}</p>

                                {reading.reversals && reading.reversalValues[i] ? (
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

                                {reading.topic !== 'General' && (
                                    <>
                                        <h4 id={`cardSpecMeaning${i}`}>Meaning for {reading.topic}</h4>
                                        {reading.reversals === true && reading.reversalValues[i] === true && (
                                            <>
                                                <p>Remember: This card is reversed! Negate the following meaning.</p>
                                            </>
                                        )}
                                        {reading.topic === 'Advice' && <p className='readingParagraph'>{card.meaningAdvice}</p>}
                                        {reading.topic === 'Love & Relationships' && <p className='readingParagraph'>{card.meaningLove}</p>}
                                        {reading.topic === 'Career' && <p className='readingParagraph'>{card.meaningCareer}</p>}
                                    </>
                                )}

                                {spread.name === 'Yes or No' && (
                                    <>
                                        <h4 id={`cardYesNo`}>Finally: Yes or No?</h4>
                                        {reading.reversals === true && reading.reversalValues[i] === true && (
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
                    {spread && spread?.numPulls > 1 && (
                    <>
                        <h3 id={`combined`}>Combined</h3>

                        {reading.relations.map((relationId, rIdx) => {
                            const relation = relations.find(r => r.id === relationId);
                            if (!relation) return null;

                            return (
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

                                    {reading.topic !== 'General' &&
                                        ((reading.topic === 'Advice' && relation.descriptionAdvice) ||
                                        (reading.topic === 'Love & Relationships' && relation.descriptionLove) ||
                                        (reading.topic === 'Career' && relation.descriptionCareer)) && (
                                        <>
                                            <h4 id={`relationSpecMeaning${rIdx}`}>
                                                {relation.cards
                                                    .map(cardId => {
                                                        const card = cards.find(c => c.id === cardId);
                                                        return card ? card.name : 'Unknown card';
                                                    })
                                                    .join(' & ')
                                                } in {reading.topic}
                                            </h4>

                                            {reading.topic === 'Advice' && relation.descriptionAdvice && (
                                                <p className='readingParagraph'>{relation.descriptionAdvice}</p>
                                            )}
                                            {reading.topic === 'Love & Relationships' && relation.descriptionLove && (
                                                <p className='readingParagraph'>{relation.descriptionLove}</p>
                                            )}
                                            {reading.topic === 'Career' && relation.descriptionCareer && (
                                                <p className='readingParagraph'>{relation.descriptionCareer}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </>
                    )}
                    <h3 id="notes">Notes</h3>
                    {editingNotes === false ? (
                        <div className="combinedRelation">
                            {
                                reading.notes !== "" && reading.notes !== null ? (
                                    <p className='readingParagraph'>
                                        {reading.notes}
                                    </p>
                                ):(
                                    <p className='readingParagraph'>No notes.</p>
                                )
                            }
                            <button className='editNoteBtn' onClick={()=>setEditingNotes(true)}>Edit Notes</button>
                        </div>
                    ):(
                        <div className="combinedRelation">
                            <textarea className='editNotesText' value={editedNotes} onChange={(e) => setEditedNotes(e.target.value)}></textarea>
                            <button className='editNoteBtn' onClick={()=>handleSaveNotes(editedNotes)}>Save Changes</button>
                        </div>
                    )}
                </div>
            )}
        </div>
        </>
    )
}

export default ReadingPanel