import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './ReadingsPanel.css'
import './RelationsPanel.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import type { User, Reading, Deck, Relation, Spread, Card, Topic, DrawingMethod, Suit } from '../types'
import { useNavigate } from 'react-router-dom'
import SparkleCheckbox from '../components/SparkleCheckbox'
import CardSelect from '../components/CardSelect'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'
import SelectCardPage from '../components/SelectCardPage'
import type { TocItem } from '../components/TableOfContents'
import TableOfContents from '../components/TableOfContents'

// Add this type declaration at the top of your file (after imports)
declare global {
    interface Window {
        html2pdf: any;
    }
}

interface ReadingsPanelProps {
    user: User | null
    selectedDeck: Deck | null
    showAlert: (msg: string) => void
    setLoading: (loading: boolean) => void
    token: string | null
    Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
}

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

function buildReadingToc(
    selectedCards: (Card | null)[],
    spread: Spread | null,
    relations: Relation[],
    cards: Card[],
    topic: Topic,
    reversals: boolean,
    reversalValues: boolean[]
): TocItem[] {
    const items: TocItem[] = [];

    selectedCards.forEach((card, i) => {
        if (!card) return;

        const hasTopicMeaning =
            (topic === 'Advice' && card.meaningAdvice) ||
            (topic === 'Love & Relationships' && card.meaningLove) ||
            (topic === 'Career' && card.meaningCareer);

        const children: TocItem[] = [
            { label: 'Description', targetId: `cardDesc${i}` },
            {
                label: reversals && reversalValues[i] ? 'Meaning (Reversed)' : 'Meaning (Upright)',
                targetId: `cardMeaning${i}`,
            },
        ];

        if (topic !== 'General' && hasTopicMeaning) {
            children.push({ label: `Meaning for ${topic}`, targetId: `cardSpecMeaning${i}` });
        }

        if (spread !== null && spread.name === 'Yes or No') {
            children.push({ label: 'Finally: Yes or No?', targetId: 'cardYesNo' });
        }

        items.push({
            label: `${spread?.pulls[i]}: ${card.name}`,
            targetId: `cardTitle${i}`,
            children,
        });
    });

    if (spread !== null && spread.numPulls > 1) {
        const combinedChildren: TocItem[] = relations.map((relation, rIdx) => {
            const cardNames = relation.cards
                .map(cardId => cards.find(c => c.id === cardId)?.name ?? 'Unknown card')
                .join(' & ');

            const hasTopicDescription =
                (topic === 'Advice' && relation.descriptionAdvice) ||
                (topic === 'Love & Relationships' && relation.descriptionLove) ||
                (topic === 'Career' && relation.descriptionCareer);

            const children: TocItem[] = [];
            if (topic !== 'General' && hasTopicDescription) {
                children.push({ label: `${cardNames} in ${topic}`, targetId: `relationSpecMeaning${rIdx}` });
            }

            return {
                label: cardNames,
                targetId: `relationName${rIdx}`,
                children,
            };
        });

        items.push({
            label: 'Combined',
            targetId: 'combined',
            children: combinedChildren,
        });
    }

    return items;
}

function ReadingsPanel({ user, selectedDeck, showAlert, setLoading, token, Icon }: ReadingsPanelProps) {
    const [cards, setCards] = useState<Card[]>([]);
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const [drawingMethod, setDrawingMethod] = useState<DrawingMethod>('Manual');
    const [selectedSpreadId, setSelectedSpreadId] = useState<string | null>(null);
    const [selectedCards, setSelectedCards] = useState<(Card | null)[]>([]);
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
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

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
                if (data.length > 0) {
                    setSelectedSpreadId(data[0].id);
                }
                setLoading(false);
            });
        })
        .catch(err => {
            console.error('Failed to fetch cards:', err);
            setLoading(false);
        })
    }, [])

    useEffect(() => {
        const s = spreads.find(sp => sp.id === selectedSpreadId);
        if (s) {
            setSelectedCards(Array(s.numPulls).fill(null));
        }
    }, [selectedSpreadId, spreads, drawingMethod]);

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
        if (reversals === false) {
            setReversalValues([]);
        } else if (spread) {
            setReversalValues(Array(spread.numPulls).fill(false));
        }
    }, [reversals, spread, drawingMethod]);

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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

            pdf.save(`${readingName || 'tarot-reading'}.pdf`);
            console.log('PDF saved successfully');

        } catch (error) {
            console.error('Failed to generate PDF:', error);
            showAlert('Failed to generate PDF. Please try again.');
        }
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
                    <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    <h2>Readings</h2>
                    <span className='infoBtn' style={{backgroundColor: "transparent"}}></span>
                </div>
                <div className='readingsForm'>
                    <div className='topForm'>
                    {user !== null && (
                        <div className='readingsInputOuter'>
                            <label htmlFor="name-input">Reading Name: </label>
                            <input autoComplete="off" id="name-input" type="text" onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setReadingName(e.target.value)
                                } value={readingName} >
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
                        <SparkleCheckbox
                            checked={reversals}
                            onChange={() => setReversals(!reversals)}
                            unCheckedStyle={{backgroundColor: "var(--main-background)", borderColor: "var(--main-text)"}}
                            checkedStyle={{backgroundColor: "var(--secondary-background)", borderColor: "var(--main-text)", color: "var(--accent-background)"}}
                        />
                        <label htmlFor="reversals-checkbox">Allow Reversals</label>
                    </div>
                    {drawingMethod === 'Manual' && spread && (
                        <div className='readingsInputOuter'>
                            <div className='innerCardImgs'>
                            {Array.from({ length: spread.numPulls }).map((_, i) => (
                                <>
                                <CardSelect
                                    isAnimating={isAnimating}
                                    onSelect={() => {
                                        setModalCard(i);
                                        setModalOpen(true);
                                    }}
                                    Icon={Icon}
                                    selectedCard={selectedCards[i]}
                                    selectedDeck={selectedDeck!}
                                    reversals={reversals}
                                    reversalValue={reversalValues[i]}
                                    setReversalValue={() => {
                                        const newReversalValues = [...reversalValues];
                                        newReversalValues[i] = !newReversalValues[i];
                                        setReversalValues(newReversalValues);
                                    }}
                                    allowSetReversals={true}
                                />
                                </>
                            ))}
                            </div>
                        </div>
                    )}
                    {drawingMethod === 'Virtual' && spread && (
                        <div className='readingsInputOuter'>
                            <div className='innerCardImgs'>
                            {Array.from({ length: spread.numPulls }).map((_, i) => (
                                <>
                                <CardSelect
                                    isAnimating={isAnimating}
                                    onSelect={() => {}}
                                    Icon={Icon}
                                    selectedCard={selectedCards[i]}
                                    selectedDeck={selectedDeck!}
                                    reversals={reversals}
                                    reversalValue={reversalValues[i]}
                                    setReversalValue={() => {
                                        const newReversalValues = [...reversalValues];
                                        newReversalValues[i] = !newReversalValues[i];
                                        setReversalValues(newReversalValues);
                                    }}
                                    allowSetReversals={false}
                                />
                                </>
                            ))}
                            </div>
                        </div>
                    )}
                    
                    <button className='backBtn' onClick={handleEnterClick}
                        disabled={isAnimating}>Get Reading</button>
                
                    {createdReading !== null && showDescription && (
                        <>
                        <div className='readingDescription' ref={pdfRef}>
                            <div style={{ display: 'flex', columnGap: '1rem'}} ref={headingRef}>
                                {user !== null && (
                                    <button className='mainBtn getReadingBtn' onClick={() => navigate(`/readings/${createdReading.id}`, { state: { scrollUp: true } })}>Go to Full Reading</button>
                                )}
                                <button onClick={handleDownloadPDF} className='mainBtn getReadingBtn'>Download</button>
                            </div>
                            <TableOfContents items={buildReadingToc(selectedCards, spread, relations, cards, topic, reversals, reversalValues)} />
                            {selectedCards.map((card, i) => {
                                if (!card) return null;

                                return (
                                    <div key={i} className="readingResultCard">
                                        <h3 id={`cardTitle${i}`} className="sectionHeading">
                                            {spread?.pulls[i]}: {card.name}
                                        </h3>

                                        <h4 id={`cardDesc${i}`} className="subHeading">Description</h4>
                                        <p className='readingParagraph'>{card.descriptions[selectedDeck!.id]}</p>

                                        {reversals && reversalValues[i] ? (
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

                                        {topic !== 'General' && (
                                            <>
                                                <h4 id={`cardSpecMeaning${i}`} className="subHeading">Meaning for {topic}</h4>
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
                                                <h4 id={`cardYesNo`} className="subHeading">Finally: Yes or No?</h4>
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
                                <h3 id={`combined`} className="sectionHeading">Combined</h3>

                                {relations.map((relation, rIdx) => (
                                    <div key={rIdx} className="combinedRelation">
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
                                        {topic !== 'General' && ((topic === 'Advice' && relation.descriptionAdvice) ||
                                            (topic === 'Love & Relationships' && relation.descriptionLove) ||
                                            (topic === 'Career' && relation.descriptionCareer)) && (
                                            <>
                                            <h4 id={`relationSpecMeaning${rIdx}`} className="subHeading">
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
                        </>
                    )}
                </div>
            </div>
            <Modal title={`Choose Card for Reading`} showModal={modalOpen} setShowModal={setModalOpen}>
                <SelectCardPage
                    showModal={modalOpen}
                    groupedCards={groupedCards}
                    setCard={(card: Card | null)=>{
                        let newC = [...selectedCards];
                        newC[modalCard] = card;
                        setSelectedCards(newC);
                        setModalOpen(false);
                    }}
                    selectedDeck={selectedDeck!}
                />
            </Modal>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Readings Page! `,
                    `The readings generated here are NOT full readings. That requires a human reader! This is just a fun and easy way to start readings, learn more about them, and keep track of them in your account! `,
                    `Manual drawings allow you to draw cards physically, and select the cards here for the reading. Virtual drawings generate cards randomly for you!`,
                    `Choose a reading spread using the select. Go to the Spreads page to learn more about the different spread options!`,
                    `Cards can have different meanings if reversed. Choose whether reversals are allowed in this reading using the checkbox.`,
                    `Click download at the top of your reading to download as a pdf!`,
                    `This reading uses cards from the currently selected deck. The default selected deck is the Rider-Waite Deck. You are logged in, go to the Decks page to select a different deck.`,
                    user !== null ? 
                        `You're logged in! Any readings you create here will be automatically saved to your account! Go to the account page to view past readings, and keep notes on them!` :
                        `Anyone can create new readings and download them as PDFs, but only logged in users can save them to their account! You are not logged in. Go log in to save, view, and keep notes on your readings! `
                ]} />
            </Modal>
        </>
    )
}

export default ReadingsPanel