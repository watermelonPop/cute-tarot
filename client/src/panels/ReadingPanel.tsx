import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import type { Reading, Deck, Relation, Spread, Card } from '../types'
import { useParams, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import TableOfContents, { type TocItem } from '../components/TableOfContents'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'

function buildReadingToc(
  reading: Reading,
  cards: Card[],
  spreads: Spread[],
  relations: Relation[]
): TocItem[] {
  const spread = spreads.find(s => s.id === reading.spread)
  const items: TocItem[] = []

  if (reading.cards.length > 0) {
    reading.cards.forEach((cardId, i) => {
      if (!cardId) return

      const card = cards.find(c => c.id === cardId)
      if (!card || !spread) return

      const hasTopicMeaning =
        (reading.topic === 'Advice' && card.meaningAdvice) ||
        (reading.topic === 'Love & Relationships' && card.meaningLove) ||
        (reading.topic === 'Career' && card.meaningCareer)

      const children: TocItem[] = [
        { label: 'Description', targetId: `cardDesc${i}` },
        {
          label: reading.reversals === true && reading.reversalValues[i] === true
            ? 'Meaning (Reversed)'
            : 'Meaning (Upright)',
          targetId: `cardMeaning${i}`,
        },
      ]

      if (reading.topic !== 'General' && hasTopicMeaning) {
        children.push({ label: `Meaning for ${reading.topic}`, targetId: `cardSpecMeaning${i}` })
      }

      if (spread.name === 'Yes or No') {
        children.push({ label: 'Finally: Yes or No?', targetId: 'cardYesNo' })
      }

      items.push({
        label: `${spread.pulls[i]}: ${card.name}`,
        targetId: `cardTitle${i}`,
        children,
      })
    })
  }

  if (spread && spread.numPulls > 1) {
    const relationChildren: TocItem[] = []

    if (reading.relations.length > 0) {
      reading.relations.forEach((relationId, rIdx) => {
        const relation = relations.find(r => r.id === relationId)
        if (!relation) return

        const cardNames = relation.cards
          .map(cardId => cards.find(c => c.id === cardId)?.name ?? 'Unknown card')
          .join(' & ')

        const hasTopicDescription =
          (reading.topic === 'Advice' && relation.descriptionAdvice) ||
          (reading.topic === 'Love & Relationships' && relation.descriptionLove) ||
          (reading.topic === 'Career' && relation.descriptionCareer)

        const grandchildren: TocItem[] = []

        if (reading.topic !== 'General' && hasTopicDescription) {
          grandchildren.push({
            label: `${cardNames} in ${reading.topic}`,
            targetId: `relationSpecMeaning${rIdx}`,
          })
        }

        relationChildren.push({
          label: cardNames,
          targetId: `relationName${rIdx}`,
          children: grandchildren,
        })
      })
    }

    items.push({
      label: 'Combined',
      targetId: 'combined',
      children: relationChildren,
    })
  }

  items.push({ label: 'Notes', targetId: 'notes' })

  return items
}

interface ReadingPanelProps {
  selectedDeck: Deck | null
  showAlert: (msg: string) => void
  setLoading: (loading: boolean) => void
    token: string | null
}

function ReadingPanel({ selectedDeck, showAlert, setLoading, token }: ReadingPanelProps) {
    const [reading, setReading] = useState<Reading | null>(null);
    const [relations, setRelations] = useState<Relation[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const [editingNotes, setEditingNotes] = useState<boolean>(false);
    const [editedNotes, setEditedNotes] = useState<string>("");
    const { readingId } = useParams()
    const location = useLocation();

    const pdfRef = useRef<HTMLDivElement | null>(null);
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

    useEffect(() => {
        if (location.state?.scrollUp && reading !== null) {
            let el = document.getElementById('scrollTop');
            if (el !== null) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [reading]);

    // Load all cards
    useEffect(() => {
        setLoading(true);
        fetch('/api/cards')
        .then(res => res.json())
        .then((data: Card[]) => {
            setCards(data);
            fetch('/api/spreads')
            .then(res => res.json())
            .then((data: Spread[]) => {
                setSpreads(data);
                fetch('/api/relations')
                .then(res => res.json())
                .then((data: Relation[]) => {
                    setRelations(data);
                    if (!token) {
                        console.error("No token found");
                        return;
                    }
                    fetch(`/api/readings/${readingId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                        })
                        .then(async res => {
                            if (!res.ok) {
                            const err = await res.json().catch(() => null);
                            throw new Error(err?.error || 'Failed to fetch reading');
                            }
                            return res.json();
                        })
                        .then((data: Reading) => {
                            setReading(data);

                            if (data?.notes) {
                            setEditedNotes(data.notes);
                            }

                            setLoading(false);
                        })
                        .catch(err => {
                            console.error('Failed to fetch reading:', err);
                            setLoading(false);
                        });
                })
                .catch(err => console.error('Failed to fetch relations:', err))
            })
            .catch(err => console.error('Failed to fetch spreads:', err))
        })
        .catch(err => console.error('Failed to fetch cards:', err))
    }, [])

    const handleSaveNotes = async (newNotes: string) => {
        try {
            const res = await fetch(`/api/readings/${readingId}/updateNotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',  'Authorization': `Bearer ${token}` },
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

    // Update the loader function
    const loadPdfLibraries = (): Promise<any> => {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.html2pdf) {
                resolve(window.html2pdf);
                return;
            }

            let scriptsLoaded = 0;
            const scriptsNeeded = 2;

            const checkAllLoaded = () => {
                scriptsLoaded++;
                if (scriptsLoaded === scriptsNeeded) {
                    resolve(window.html2pdf);
                }
            };

            // Load html2canvas
            const html2canvasScript = document.createElement('script');
            html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            html2canvasScript.onload = checkAllLoaded;
            html2canvasScript.onerror = reject;
            document.head.appendChild(html2canvasScript);

            // Load jsPDF
            const jsPdfScript = document.createElement('script');
            jsPdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            jsPdfScript.onload = checkAllLoaded;
            jsPdfScript.onerror = reject;
            document.head.appendChild(jsPdfScript);
        });
    };

    const handleDownloadPDF = async () => {
        if (!pdfRef.current) {
            console.error('pdfRef is null');
            showAlert('Cannot generate PDF. Please try again.');
            return;
        }

        try {
            await loadPdfLibraries();

            console.log('Starting PDF generation...');

            // Clone the element for off-screen rendering
            const clone = pdfRef.current.cloneNode(true) as HTMLElement;
            clone.classList.add('pdf-export');
            
            // Position clone off-screen but make it visible to html2canvas
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.width = pdfRef.current.offsetWidth + 'px';
            container.appendChild(clone);
            document.body.appendChild(container);

            // Small delay to ensure clone is rendered
            await new Promise(resolve => setTimeout(resolve, 100));

            // Use html2canvas on the clone
            const canvas = await (window as any).html2canvas(clone, {
                scale: 2,
                useCORS: false,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: clone.scrollWidth,
                height: clone.scrollHeight,
            });

            console.log('Canvas created:', {
                width: canvas.width,
                height: canvas.height
            });

            // Remove the clone container
            document.body.removeChild(container);

            const { jsPDF } = (window as any).jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const margin = 10;
            const contentWidth = pdfWidth - (2 * margin);
            const contentHeight = pdfHeight - (2 * margin);
            
            // Calculate scaling based on width
            const imgHeight = (canvas.height * contentWidth) / canvas.width;
            
            // How much height fits on each page
            const pageContentHeight = contentHeight;
            const totalPages = Math.ceil(imgHeight / pageContentHeight);

            for (let page = 0; page < totalPages; page++) {
                if (page > 0) {
                    pdf.addPage();
                }
                
                // Calculate the vertical position for this page in the scaled image
                const yPositionInScaledImg = page * pageContentHeight;
                
                // Map back to canvas coordinates
                const sourceY = (yPositionInScaledImg * canvas.height) / imgHeight;
                const sourceHeight = Math.min(
                    (pageContentHeight * canvas.height) / imgHeight,
                    canvas.height - sourceY
                );
                
                // Create a temporary canvas for this page's slice
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sourceHeight;
                
                const ctx = pageCanvas.getContext('2d');
                if (ctx) {
                    // Draw the slice from the main canvas
                    ctx.drawImage(
                        canvas,
                        0, sourceY, // source x, y
                        canvas.width, sourceHeight, // source width, height
                        0, 0, // destination x, y
                        pageCanvas.width, pageCanvas.height // destination width, height
                    );
                    
                    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
                    
                    // Calculate actual height for this slice in PDF
                    const sliceHeight = (pageCanvas.height * contentWidth) / pageCanvas.width;
                    
                    pdf.addImage(
                        pageImgData,
                        'JPEG',
                        margin,
                        margin,
                        contentWidth,
                        sliceHeight
                    );
                }
            }

            pdf.save(`${reading?.name || 'tarot-reading'}.pdf`);
            console.log('PDF saved successfully');

        } catch (error) {
            console.error('Failed to generate PDF:', error);
            showAlert('Failed to generate PDF. Please try again.');
        }
    };


    const spread = spreads.find(s => s.id === reading?.spread);
    if (!reading) return;

    return(
        <div className='panel'>
            <div className='panelTitle'>
                <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                <h2>{reading.name}</h2>
                <span className='infoBtn' style={{backgroundColor: "transparent"}}></span>
            </div>
            <div className='innerCardImgs' id="scrollTop">
                {reading.cards.map((cardId, idx) => {
                    const card = cards.find(c => c.id === cardId);

                    if (!card) return null;

                    return (
                        <div key={cardId} className="cardImgInnerBorder">
                            <div className="cardEffectLayer">
                                <div className="cardBackOverlayWrapper">
                                    <div className="innerCardImg cardAspect"></div>
                                    <div className="cardBackTextWrapper">
                                        <img
                                            src={`${selectedDeck?.images['card-front']}/${card.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                                            className={reading.reversalValues[idx] === true ? "innerSpreadImg upside-down" : "innerSpreadImg"}
                                            alt={`Deck card ${card.name}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className='cardDescription' ref={pdfRef}>
                <div style={{ display: 'flex', columnGap: '1rem'}}>
                    <button onClick={handleDownloadPDF} className='mainBtn getReadingBtn'>Download</button>
                </div> 
                <TableOfContents items={buildReadingToc(reading, cards, spreads, relations)} />
                {reading.cards.map((cardId, i) => {
                    if (!cardId) return null;

                    const card = cards.find(c => c.id === cardId);
                    const spread = spreads.find(s => s.id === reading.spread);

                    if(!card || !spread) return;

                    return (
                        <div key={i} className="readingResultCard">
                            <h3 id={`cardTitle${i}`} className="sectionHeading">
                                {spread?.pulls[i]}: {card.name}
                            </h3>

                            <h4 id={`cardDesc${i}`} className="subHeading">Description</h4>
                            <p className='readingParagraph'>{card.descriptions[selectedDeck!.id]}</p>

                            {reading.reversals && reading.reversalValues[i] ? (
                                <>
                                    <h4 id={`cardMeaning${i}`} className="subHeading">Meaning (Reversed)</h4>
                                    <p className='readingParagraph'>{card.meaningRev}</p>
                                </>
                            ) : (
                                <>
                                    <h4 id={`cardMeaning${i}`} className="subHeading">Meaning (Upright)</h4>
                                    <p className='readingParagraph'>{card.meaningUp}</p>
                                </>
                            )}

                            {reading.topic !== 'General' && (
                                <>
                                    <h4 id={`cardSpecMeaning${i}`} className="subHeading">Meaning for {reading.topic}</h4>
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

                            {spread?.name === 'Yes or No' && (
                                <>
                                    <h4 id={`cardYesNo`} className="subHeading">Finally: Yes or No?</h4>
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
                {spread !== undefined && spread.numPulls > 1 && (
                    <>
                        <h3 id="combined" className="sectionHeading">Combined</h3>

                        {reading.relations.map((relationId, rIdx) => { // Changed ({ to {
                            if (!relationId) return null;

                            const relation = relations.find(r => r.id === relationId);
                            if (!relation) return null; // Map should return null instead of undefined for React

                            return (
                                <div key={rIdx} className="combinedRelation"> {/* Key belongs on the outermost element here */}
                                    <h4 id={`relationName${rIdx}`} className="subHeading">
                                        {relation.cards
                                            .map(cardId => {
                                                const card = cards.find(c => c.id === cardId);
                                                return card ? card.name : 'Unknown card';
                                            })
                                            .join(' & ')
                                        }
                                    </h4>
                                    <p className='readingParagraph'>{relation.description}</p>
                                    
                                    {/* Simplified the topic conditional check block */}
                                    {reading.topic !== 'General' && (
                                        ((reading.topic === 'Advice' && relation.descriptionAdvice) ||
                                        (reading.topic === 'Love & Relationships' && relation.descriptionLove) ||
                                        (reading.topic === 'Career' && relation.descriptionCareer))
                                    ) && (
                                        <>
                                            <h4 id={`relationSpecMeaning${rIdx}`} className="subHeading">
                                                {relation.cards
                                                    .map(cardId => {
                                                        const card = cards.find(c => c.id === cardId);
                                                        return card ? card.name : 'Unknown card';
                                                    })
                                                    .join(' & ')
                                                } in {reading.topic}
                                            </h4>
                                            {reading.topic === "Advice" && relation.descriptionAdvice !== "" ? (
                                                <p className='readingParagraph'>{relation.descriptionAdvice}</p>
                                            ) : reading.topic === "Love & Relationships" && relation.descriptionLove !== "" ? (
                                                <p className='readingParagraph'>{relation.descriptionLove}</p>
                                            ) : reading.topic === "Career" && relation.descriptionCareer !== "" ? (
                                                <p className='readingParagraph'>{relation.descriptionCareer}</p>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            <h3 id="notes" className="sectionHeading">Notes</h3>
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
                        <button className='mainBtn' onClick={()=>setEditingNotes(true)}>Edit Notes</button>
                    </div>
                ):(
                    <div className="combinedRelation">
                        <textarea className='editNotesText' value={editedNotes} onChange={(e) => setEditedNotes(e.target.value)}></textarea>
                        <button className='mainBtn' onClick={()=>handleSaveNotes(editedNotes)}>Save Changes</button>
                    </div>
                )}
            </div>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Reading Page! `,
                    `You can click Edit Notes to add and update thoughts and interpretations for the reading.`
                ]} />
            </Modal>
        </div>
    )
}
export default ReadingPanel