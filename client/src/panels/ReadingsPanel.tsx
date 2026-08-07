import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './ReadingsPanel.css'
import './RelationsPanel.css'
import '../components/NotesPanel.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import type { User, Reading, Deck, Relation, Spread, Card, Topic, DrawingMethod, Suit } from '../types'
import { useNavigate } from 'react-router-dom'
import SparkleCheckbox from '../components/SparkleCheckbox'
import CardSelect from '../components/CardSelect'
import DeckSelect from '../components/DeckSelect'
import SpreadSelect from '../components/SpreadSelect'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'
import SelectCardPage from '../components/SelectCardPage'
import SelectDeckPage from '../components/SelectDeckPage'
import SelectSpreadPage from '../components/SelectSpreadPage'
import TableOfContents from '../components/TableOfContents'
import AnnotationToolbar from '../components/AnnotationToolbar'
import ReadingCardSection from '../components/ReadingCardSection'
import CombinedRelationsSection from '../components/CombinedRelationsSection'
import NotesSection from '../components/NotesSection'
import { useAnnotationSelection } from '../hooks/useAnnotationSelection'
import { useAnnotations } from '../hooks/useAnnotations'
import { findAnnotationAtSelection, isRangeFullyHideMode } from '../lib/annotation/core'
import { buildReadingToc } from '../lib/readingHelpers'
import { exportReadingToPdfNative } from '../lib/pdf/export'
import { authFetch } from '../lib/authFetch'

interface ReadingsPanelProps {
    user: User | null
    selectedDeck: Deck | null
    decks: Deck[]
    cards: Card[]
    showAlert: (msg: string) => void
    setLoading: (loading: boolean) => void
    token: string | null
    Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
    CardIcon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
    isMobile: () => boolean
}

function ReadingsPanel({ user, selectedDeck, decks, cards, showAlert, setLoading, token, Icon, CardIcon, isMobile }: ReadingsPanelProps) {
    const [spreads, setSpreads] = useState<Spread[]>([]);
    // Deck this reading will be created with. Defaults to (and stays in
    // sync with) the app's globally-equipped deck until the user overrides
    // it via the Deck row's picker — a per-form choice, distinct from
    // equipping a deck app-wide.
    const [formDeck, setFormDeck] = useState<Deck | null>(selectedDeck);
    // Tracks whether the user has explicitly picked a deck via the Deck
    // row's modal — once true, formDeck stops following selectedDeck so an
    // in-progress override isn't clobbered by an unrelated global change.
    const deckOverriddenRef = useRef(false);
    const [deckModalOpen, setDeckModalOpen] = useState<boolean>(false);
    const [spreadModalOpen, setSpreadModalOpen] = useState<boolean>(false);
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
    // Only true once the reading has actually been saved to the DB (logged
    // in AND the POST succeeded) — controls whether annotation edits below
    // hit the API or just update createdReading locally in memory.
    const [readingPersisted, setReadingPersisted] = useState<boolean>(false);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);
    const [readingName, setReadingName] = useState<string>("");
    const [editingNotes, setEditingNotes] = useState<boolean>(false);
    const [editedNotes, setEditedNotes] = useState<string>("");
    const pdfRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate()
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

    const {
        pendingSelection,
        clearSelectionToolbar,
        toolbarRef,
        highlightSubmenuOpen,
        setHighlightSubmenuOpen,
        noteSubmenuOpen,
        setNoteSubmenuOpen,
        handleContainerMouseDown,
        handleTextSelection,
        selectAnnotationAndOpenToolbar,
    } = useAnnotationSelection(pdfRef, createdReading);

    const {
        handleHide,
        handleStrikethrough,
        handleHighlight,
        handleNote,
        handleDeleteAnnotationNote,
        handleEditAnnotationNote,
    } = useAnnotations({
        readingId: createdReading?.id,
        token,
        reading: createdReading,
        setReading: setCreatedReading,
        showAlert,
        clearSelectionToolbar,
        persistRemotely: readingPersisted,
    });

    // Load all spreads. Cards/decks come from App-level state instead of
    // being fetched here.
    useEffect(() => {
        setLoading(true);
        fetch('/api/spreads')
        .then(res => res.json())
        .then((data: Spread[]) => {
            setSpreads(data);
            if (data.length > 0) {
                setSelectedSpreadId(data[0].id);
            }
            setLoading(false);
        })
        .catch(err => {
            console.error('Failed to fetch spreads:', err);
            setLoading(false);
        })
    }, [])

    // Keep formDeck in sync with the app's globally-equipped deck until the
    // user explicitly overrides it here — covers both this panel mounting
    // before App's own deck fetch resolves (selectedDeck arriving late) and
    // selectedDeck changing later on (e.g. logging in swaps in the user's
    // saved deck).
    useEffect(() => {
        if (!deckOverriddenRef.current) {
            setFormDeck(selectedDeck);
        }
    }, [selectedDeck])

    useEffect(() => {
        const s = spreads.find(sp => sp.id === selectedSpreadId);
        if (s) {
            setSelectedCards(Array(s.numPulls).fill(null));
        }
    }, [selectedSpreadId, spreads, drawingMethod]);

    useEffect(() => {
        setShowDescription(false);
        setCreatedReading(null);
        setReadingPersisted(false);
        setEditingNotes(false);
        setEditedNotes("");
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
        let relationData: Relation[] = [];

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
            name: readingName || undefined,
            date: String(new Date()),
            cards: safeFinalCards.map(card => card.id),
            reversals,
            reversalValues: finalReversalValues,
            spread: spread?.id,
            topic,
            relations: relationData.map((r: Relation) => r.id),
            annotations: [],
            deckId: formDeck?.id ?? "",
        } as Reading;

        // =============================
        // Save to backend (if logged in)
        // =============================
        setReadingPersisted(false);

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
                deckId: formDeck?.id,
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
                name: savedReading.name,
                date: savedReading.date,
                annotations: savedReading.annotations ?? [],
            };
            setReadingPersisted(true);
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


    // Logged-out readings are never persisted at all (the whole reading,
    // annotations included, only lives in this component's state and is
    // gone on refresh) — so an unpersisted note just updates createdReading
    // locally, same as any other in-memory annotation edit here. Once the
    // reading IS persisted, notes go through the same updateNotes endpoint
    // ReadingPanel uses for a saved reading.
    const handleSaveNotes = async (newNotes: string) => {
        if (!createdReading) return;

        if (readingPersisted) {
            try {
                const updatedReading = await authFetch<Reading>(`/api/readings/${createdReading.id}/updateNotes`, token, {
                    method: 'POST',
                    body: JSON.stringify({ notes: newNotes }),
                });
                setCreatedReading(updatedReading);
            } catch (err) {
                console.error('Failed to save notes:', err);
                showAlert('Failed to save notes. Please try again.');
                return;
            }
        } else {
            setCreatedReading({ ...createdReading, notes: newNotes });
        }

        setEditingNotes(false);
    };

    const handleDownloadPDF = async () => {
        if (!createdReading || !formDeck) {
            showAlert('Cannot generate PDF. Please try again.');
            return;
        }

        try {
            await exportReadingToPdfNative(
                { reading: createdReading, cards, spreads, relations, selectedDeck: formDeck },
                `${createdReading.name || readingName || 'tarot-reading'}.pdf`
            );
        } catch (err) {
            console.error('Failed to generate PDF:', err);
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

    const activeAnnotation = pendingSelection
        ? findAnnotationAtSelection(
              createdReading?.annotations ?? [],
              pendingSelection.targetId,
              pendingSelection.startOffset,
              pendingSelection.endOffset
          )
        : undefined;

    const isHiddenActive = pendingSelection
        ? isRangeFullyHideMode(
              createdReading?.annotations ?? [],
              pendingSelection.targetId,
              pendingSelection.startOffset,
              pendingSelection.endOffset,
              'hidden'
          )
        : false;
    const isStrikethroughActive = pendingSelection
        ? isRangeFullyHideMode(
              createdReading?.annotations ?? [],
              pendingSelection.targetId,
              pendingSelection.startOffset,
              pendingSelection.endOffset,
              'strikethrough'
          )
        : false;
    const isHighlightActive = !!activeAnnotation?.highlightColor;
    const isNoteActive = !!activeAnnotation?.note;
    const focusedAnnotationId = activeAnnotation?.id ?? null;

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
                            <label htmlFor="name-input">{!isMobile() && `Reading`} Name: </label>
                            <input autoComplete="off" id="name-input" type="text" onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setReadingName(e.target.value)
                                } value={readingName} >
                            </input>
                        </div>
                    )}
                    <div className='readingsInputOuter'>
                        <label htmlFor="deck-select">Deck: </label>
                        <DeckSelect selectedDeck={formDeck} onSelect={() => setDeckModalOpen(true)} />
                    </div>
                    <div className='readingsInputOuter'>
                        <label htmlFor="spread-select">Spread: </label>
                        <SpreadSelect selectedSpread={spread} onSelect={() => setSpreadModalOpen(true)} />
                    </div>
                    <div className='readingsInputOuter'>
                        <label htmlFor='drawing-select'>{!isMobile() && `Drawing`} Method: </label>
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
                                    selectedDeck={formDeck!}
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
                                    selectedDeck={formDeck!}
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
                    
                    <button className='mainBtn' onClick={handleEnterClick}
                        disabled={isAnimating}>Get Reading</button>
                
                    {createdReading !== null && showDescription && (
                        <>
                        <div
                            className='readingDescription'
                            ref={pdfRef}
                            onMouseUp={handleTextSelection}
                            onMouseDown={handleContainerMouseDown}
                        >
                            <div style={{ display: 'flex', columnGap: '1rem'}} ref={headingRef}>
                                {user !== null && (
                                    <button className='mainBtn getReadingBtn' onClick={() => navigate(`/readings/${createdReading.id}`, { state: { scrollUp: true } })}>Go to Full Reading</button>
                                )}
                                <button onClick={handleDownloadPDF} className='mainBtn getReadingBtn'>Download</button>
                            </div>
                            <TableOfContents items={buildReadingToc(createdReading, cards, spread ? [spread] : [], relations)} />
                            {selectedCards.map((card, i) => {
                                if (!card || !spread) return null;

                                return (
                                    <ReadingCardSection
                                        key={i}
                                        index={i}
                                        card={card}
                                        spread={spread}
                                        reading={createdReading}
                                        selectedDeck={formDeck}
                                        annotations={createdReading.annotations}
                                        onDeleteNote={handleDeleteAnnotationNote}
                                        onEditNote={handleEditAnnotationNote}
                                        onSelectAnnotation={selectAnnotationAndOpenToolbar}
                                        focusedAnnotationId={focusedAnnotationId}
                                        isMobile={isMobile}
                                    />
                                );
                            })}
                            {spread !== null && spread.numPulls > 1 && (
                                <CombinedRelationsSection
                                    reading={createdReading}
                                    relations={relations}
                                    cards={cards}
                                    annotations={createdReading.annotations}
                                    onDeleteNote={handleDeleteAnnotationNote}
                                    onEditNote={handleEditAnnotationNote}
                                    onSelectAnnotation={selectAnnotationAndOpenToolbar}
                                    focusedAnnotationId={focusedAnnotationId}
                                    isMobile={isMobile}
                                />
                            )}
                            <NotesSection
                                notes={createdReading.notes}
                                editing={editingNotes}
                                editedNotes={editedNotes}
                                onStartEdit={() => {
                                    setEditedNotes(createdReading.notes ?? "");
                                    setEditingNotes(true);
                                }}
                                onChangeEditedNotes={setEditedNotes}
                                onSave={handleSaveNotes}
                            />
                        </div>
                        </>
                    )}
                </div>
            </div>

            {pendingSelection && (
                <AnnotationToolbar
                    pendingSelection={pendingSelection}
                    toolbarRef={toolbarRef}
                    activeAnnotation={activeAnnotation}
                    isHiddenActive={isHiddenActive}
                    isStrikethroughActive={isStrikethroughActive}
                    isHighlightActive={isHighlightActive}
                    isNoteActive={isNoteActive}
                    highlightSubmenuOpen={highlightSubmenuOpen}
                    setHighlightSubmenuOpen={setHighlightSubmenuOpen}
                    noteSubmenuOpen={noteSubmenuOpen}
                    setNoteSubmenuOpen={setNoteSubmenuOpen}
                    onHide={() => handleHide(pendingSelection)}
                    onStrikethrough={() => handleStrikethrough(pendingSelection)}
                    onHighlight={color => handleHighlight(pendingSelection, color)}
                    onSaveNote={noteText => handleNote(pendingSelection, noteText)}
                    isMobile={isMobile}
                />
            )}

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
                    selectedDeck={formDeck!}
                    selectedCard={selectedCards[modalCard]}
                />
            </Modal>
            <Modal title="Choose Deck" showModal={deckModalOpen} setShowModal={setDeckModalOpen}>
                <SelectDeckPage
                    showModal={deckModalOpen}
                    decks={decks}
                    setDeck={(deck) => {
                        deckOverriddenRef.current = true;
                        setFormDeck(deck);
                        setDeckModalOpen(false);
                    }}
                    selectedDeck={formDeck}
                />
            </Modal>
            <Modal title="Choose Spread" showModal={spreadModalOpen} setShowModal={setSpreadModalOpen}>
                <SelectSpreadPage
                    showModal={spreadModalOpen}
                    spreads={spreads}
                    setSpread={(s) => {
                        setSelectedSpreadId(s.id);
                        setSpreadModalOpen(false);
                    }}
                    selectedSpread={spread}
                    CardIcon={CardIcon}
                />
            </Modal>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Readings Page!`,
                    `The readings generated here are NOT full readings, that requires a human reader! This is just a fun, easy way to start readings, learn more about them, and keep track of them in your account.`,
                    `Manual drawings let you physically draw cards and select them here; Virtual drawings draw random cards for you.`,
                    `Choose a spread using the select. Visit the Spreads page to learn more about each option.`,
                    `Cards can have different meanings when reversed. Use the checkbox to allow reversals in this reading.`,
                    `This reading uses cards from the deck input, which defaults to your currently selected deck. Change it here if you want a different one for this reading.`,
                    `Select text anywhere in the reading to hide, strike through, highlight, or add a note. A popup menu will appear with your options. Headings and selections spanning more than one section can't be annotated. Adding a note always applies a highlight too. Choose from 5 highlight colors. Notes will appear in a small column next to the text they're attached to.`,
                    `A general notes section is also available at the bottom of each reading.`,
                    `Click Download at the top of your reading to save it with your notes and annotations applied as a PDF.`,
                    `Anyone can create readings and add annotations. They're saved or discarded along with the rest of the reading depending on whether you're logged in.`,
                    user === null
                        ? `You're not logged in. Log in to save readings, revisit them, and keep adding notes and annotations.`
                        : `You're logged in, so readings you create are saved automatically to your account — visit the Account page anytime to revisit them and add or edit annotations and notes.`
                ]} />
            </Modal>
        </>
    )
}

export default ReadingsPanel