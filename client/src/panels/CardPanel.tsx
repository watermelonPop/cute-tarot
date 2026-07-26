import { useState, useEffect } from 'react'
import '../App.css'
import './panel.css'
import type { User, Deck, Card } from '../types'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import InteractiveCard from '../components/InteractiveCard';
import type { TocItem } from '../components/TableOfContents'
import TableOfContents from '../components/TableOfContents';
import Modal from '../components/Modal';
import InfoPage from '../components/InfoPage';

function buildCardToc(card: Card): TocItem[] {
    if(!card){
        return [];
    }
  const items: TocItem[] = [
    {
      label: 'Keywords',
      targetId: 'keywordsSection',
    },
    {
      label: 'Description',
      targetId: 'descriptionSection',
    },
  ]

  const meaningChildren: TocItem[] = []

  if (card.meaningUp) {
    meaningChildren.push({ label: 'Upright', targetId: 'meaningUpright' })
  }
  if (card.meaningRev) {
    meaningChildren.push({ label: 'Reversed', targetId: 'meaningReversed' })
  }
  if (card.meaningYesNo) {
    meaningChildren.push({ label: 'Yes or No', targetId: 'meaningYesNo' })
  }
  if (card.meaningAdvice) {
    meaningChildren.push({ label: 'Advice', targetId: 'meaningAdvice' })
  }
  if (card.meaningLove) {
    meaningChildren.push({ label: 'Love and Relationships', targetId: 'meaningLove' })
  }
  if (card.meaningCareer) {
    meaningChildren.push({ label: 'Career', targetId: 'meaningCareer' })
  }

  items.push({
    label: 'Meanings',
    targetId: 'meaningsSection',
    children: meaningChildren,
  })

  return items
}

interface CardPanelProps {
    user: User | null
    selectedDeck: Deck | null
    showAlert: (msg: string) => void
    setLoading: (loading: boolean) => void
    token: string | null
}

function CardPanel({ user, selectedDeck, showAlert, setLoading, token}: CardPanelProps){
    const [cards, setCards] = useState<Card[]>([])
    const { nameShort } = useParams()
    const navigate = useNavigate();
    const [adminEditing, setAdminEditing] = useState<boolean>(false);

    const [editableCard, setEditableCard] = useState<Card | null>(null);
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
    const [showInspectModal, setShowInspectModal] = useState<boolean>(false);

    // Load all cards
    useEffect(() => {
        setLoading(true);
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
    }, [])


    // Find the card based on the URL param
    const currentCard = nameShort ? cards.find(c => c.nameShort === nameShort) : null;
    
    useEffect(() => {
        if (currentCard) {
            setEditableCard(currentCard);
        }
    }, [currentCard]);

    const autoResize = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = "auto";            // reset
        el.style.height = `${el.scrollHeight}px`; // grow to fit
    };

    const handleSaveEdits = async () => {
        if(user?.type !== "Admin" || adminEditing === false || !currentCard?.id || !token){
            showAlert("Not authorized for editing.");
            return;
        }
        console.log("SAVE TOKEN: " + token);

        try {
            const res = await fetch(`/api/cards/${currentCard?.id}/updateCard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    meaningUp: editableCard?.meaningUp, 
                    meaningRev: editableCard?.meaningRev, 
                    keywordsUp: editableCard?.keywordsUp, 
                    keywordsRev: editableCard?.keywordsRev, 
                    meaningAdvice: editableCard?.meaningAdvice, 
                    meaningLove: editableCard?.meaningLove, 
                    meaningCareer: editableCard?.meaningCareer,  
                    meaningYesNo: editableCard?.meaningYesNo, 
                    descriptions: editableCard?.descriptions 
                }),
            });

            // Handle HTTP errors
            if (!res.ok) {
            const err = await res.json();
                throw new Error(err.error || 'Failed to save card');
            }

            // Updated card returned from server
            const updatedCard: Card = await res.json();

            // Update local state
            setCards(prev =>
                prev.map(card =>
                    card.id === updatedCard.id ? updatedCard : card
                )
            );
            setEditableCard(updatedCard);
            setAdminEditing(false);

        } catch (err) {
            console.error('Failed to save card:', err);
            showAlert('Failed to save card. Please try again.');
        }
    }


    //type, name, meaningUp, meaningRev, keywordsUp, keywordsRev, meaningAdvice, meaningLove, meaningCareer,  meaningYesNo, descriptions
    return (
        <>
            <div className='panel'>
                {
                    currentCard === null ? (
                        <>
                        <p>This card doesn't exist.</p>
                        </>
                    ):(
                        <>
                            <div className='deeperPanelHeading'>
                                <button className='backBtn' onClick={() => navigate('/cards')}>
                                    Back
                                </button>
                                <h2 className='deeperPanelTitle'>{currentCard?.name}</h2>
                                <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                            </div>
                            <div className='innerCardImgs'>
                                <div className='cardImgInnerBorder'>
                                    <img
                                        src={`${selectedDeck?.images['card-back']}`}
                                        className="innerCardImg"
                                        alt={`Deck back`}
                                    />
                                </div>
                                <div className='cardImgInnerBorder'>
                                    <img
                                        src={`${selectedDeck?.images['card-front']}/${currentCard?.type.replaceAll(" ", "")}/${currentCard?.nameShort}.png`}
                                        className="innerCardImg"
                                        alt={`Deck card ${currentCard?.name}`}
                                    />
                                </div>
                            </div>
                            <div className='outerEditBtn'>
                                <button className='backBtn' onClick={()=>setShowInspectModal(true)}>Inspect</button>
                                <button className='backBtn' onClick={() => navigate(`/relations/${currentCard?.nameShort}`)}>Search Relations</button>
                            </div>
                            {
                                user?.type === "Admin" && (
                                    adminEditing === true ? (
                                        <div className='outerEditBtn'>
                                            <button className='backBtn' onClick={()=>setAdminEditing(false)}>Cancel Edit</button>
                                        </div>
                                    ):(
                                        <>
                                        <div className='outerEditBtn'>
                                            <button className='backBtn' onClick={()=>setAdminEditing(true)}>Edit Card</button>
                                        </div>
                                        </>
                                    )
                                )
                            }
                            <div className='cardDescription'>
                            {
                                user?.type !== "Admin" || adminEditing === false ? (
                                    <>
                                        <TableOfContents items={buildCardToc(currentCard!)} />
                                        <p className="centered">{currentCard?.value} - {currentCard?.type}</p>
                                        <h3 id="keywordsSection" className="sectionHeading">Keywords</h3>
                                        <p className="centered">Upright: {currentCard?.keywordsUp}</p>
                                        <p className="centered">Reversed: {currentCard?.keywordsRev}</p>
                                        <h3 id="descriptionSection" className="sectionHeading">Description</h3>
                                        <p className='cardParagraph'>{selectedDeck !== null ? currentCard?.descriptions[selectedDeck?.id]: ""}</p>
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
                                    </>
                                ):(
                                    <>
                                        <p>{currentCard?.value} - {currentCard?.type}</p>
                                        <h3>Keywords</h3>
                                        <div className='cardEditInput'>
                                            <label>Upright: </label>
                                            <textarea ref={(el) => autoResize(el)} value={editableCard?.keywordsUp} onChange={(e) => {
                                                if (!editableCard) return;

                                                setEditableCard({
                                                ...editableCard,
                                                keywordsUp: e.target.value,
                                                });
                                            }}></textarea>
                                        </div>
                                        <div className='cardEditInput'>
                                            <label>Reversed: </label>
                                            <textarea ref={(el) => autoResize(el)} value={editableCard?.keywordsRev} onChange={(e) => {
                                                if (!editableCard) return;

                                                setEditableCard({
                                                ...editableCard,
                                                keywordsRev: e.target.value,
                                                });
                                            }}></textarea>
                                        </div>
                                        <h3>Description</h3>
                                        <div className='cardEditInput'>
                                            <label>{selectedDeck?.name} Deck: </label>
                                            <textarea ref={(el) => autoResize(el)} value={
                                                selectedDeck
                                                    ? editableCard?.descriptions?.[selectedDeck.id] ?? ""
                                                    : ""
                                                }
                                                onChange={(e) => {
                                                if (!editableCard || !selectedDeck) return;

                                                setEditableCard({
                                                    ...editableCard,
                                                    descriptions: {
                                                    ...editableCard.descriptions,
                                                    [selectedDeck.id]: e.target.value,
                                                    },
                                                });
                                            }}></textarea>
                                        </div>
                                        <h3>Meanings</h3>
                                        <div className='cardEditInput'>
                                            <label>Upright: </label>
                                            <textarea ref={(el) => autoResize(el)} value={editableCard?.meaningUp} onChange={(e) => {
                                                if (!editableCard) return;

                                                setEditableCard({
                                                ...editableCard,
                                                meaningUp: e.target.value,
                                                });
                                            }}></textarea>
                                        </div>
                                        <div className='cardEditInput'>
                                            <label>Reversed: </label>
                                            <textarea ref={(el) => autoResize(el)} value={editableCard?.meaningRev} onChange={(e) => {
                                                if (!editableCard) return;

                                                setEditableCard({
                                                ...editableCard,
                                                meaningRev: e.target.value,
                                                });
                                            }}></textarea>
                                        </div>
                                        <div className='cardEditInput'>
                                            <label>Yes or No: </label>
                                            <textarea ref={(el) => autoResize(el)} value={editableCard?.meaningYesNo} onChange={(e) => {
                                                if (!editableCard) return;

                                                setEditableCard({
                                                ...editableCard,
                                                meaningYesNo: e.target.value,
                                                });
                                            }}></textarea>
                                        </div>
                                        <div className='cardEditInput'>
                                            <label>Advice: </label>
                                            <textarea ref={(el) => autoResize(el)} value={editableCard?.meaningAdvice} onChange={(e) => {
                                                if (!editableCard) return;

                                                setEditableCard({
                                                ...editableCard,
                                                meaningAdvice: e.target.value,
                                                });
                                            }}></textarea>
                                        </div>
                                        <div className='cardEditInput'>
                                            <label>Love and Relationships: </label>
                                            <textarea ref={(el) => autoResize(el)} value={editableCard?.meaningLove} onChange={(e) => {
                                                if (!editableCard) return;

                                                setEditableCard({
                                                ...editableCard,
                                                meaningLove: e.target.value,
                                                });
                                            }}></textarea>
                                        </div>
                                        <div className='cardEditInput'>
                                            <label>Career: </label>
                                            <textarea ref={(el) => autoResize(el)} value={editableCard?.meaningCareer} onChange={(e) => {
                                                if (!editableCard) return;

                                                setEditableCard({
                                                ...editableCard,
                                                meaningCareer: e.target.value,
                                                });
                                            }}></textarea>
                                        </div>
                                        <div className='outerEditBtn'>
                                            <button className='backBtn' onClick={()=>handleSaveEdits()}>Save Edits</button>
                                        </div>
                                    </>
                                )
                            }
                            </div>
                        </>
                    )
                }
            </div>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Card page for ${currentCard?.name}!`,
                    `This page shows the back and front side of ${currentCard?.name} for the selected deck, as well as detailed information including the keywords, description, and various meanings.`,
                    `Click the inspect button to view a draggable 3d version of the card.`,
                    `Click the Search Relations button to go to the relations generator with ${currentCard?.name} already selected.`,
                    user !== null ? 
                        `The default selected deck is the Rider-Waite Deck. You are logged in, go to the decks page to select a different deck for your account!` :
                        `The default selected deck is the Rider-Waite Deck. Go to the decks page to select and browse using a different deck. You're logged out, so this selection only lasts until you refresh!`
                ]} />
            </Modal>
            {showInspectModal && (
                <div className="cardModal">
                    <div
                    className="card3dScene"
                    onClick={(e) => e.stopPropagation()}
                    >
                    <InteractiveCard
                        front={`${selectedDeck?.images['card-front']}/${currentCard?.type.replaceAll(" ", "")}/${currentCard?.nameShort}.png`}
                        back={`${selectedDeck?.images['card-back']}`}
                    />
                    </div>
                    <button className='backBtn' onClick={() => setShowInspectModal(false)} style={{
                        backgroundColor: selectedDeck?.style['accent-background'],
                        color: selectedDeck?.style['accent-text']
                    }}>Close</button>
                </div>
            )}
        </>
    )
}

export default CardPanel