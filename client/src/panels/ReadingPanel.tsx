import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './ReadingsPanel.css'
import '../components/NotesPanel.css'
import type { Reading, Deck, Relation, Spread, Card } from '../types'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import TableOfContents from '../components/TableOfContents'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'
import AnnotationToolbar from '../components/AnnotationToolbar'
import ReadingCardSection from '../components/ReadingCardSection'
import CombinedRelationsSection from '../components/CombinedRelationsSection'
import NotesSection from '../components/NotesSection'
import { authFetch } from '../lib/authFetch'
import { exportReadingToPdfNative } from '../lib/pdf/export'
import { buildReadingToc } from '../lib/readingHelpers'
import { useAnnotationSelection } from '../hooks/useAnnotationSelection'
import { useAnnotations } from '../hooks/useAnnotations'
import {
  findAnnotationAtSelection,
  isRangeFullyHideMode,
} from '../lib/annotation/core'

interface ReadingPanelProps {
  selectedDeck: Deck | null
  decks: Deck[]
  cards: Card[]
  showAlert: (msg: string) => void
  setLoading: (loading: boolean) => void
  token: string | null
  isMobile: () => boolean
  setUserSelectedDeck: (deckId: string) => void
}

function ReadingPanel({ selectedDeck, decks, cards, showAlert, setLoading, token, isMobile, setUserSelectedDeck }: ReadingPanelProps) {
  const [reading, setReading] = useState<Reading | null>(null)
  const [relations, setRelations] = useState<Relation[]>([])
  const [spreads, setSpreads] = useState<Spread[]>([])
  const [editingNotes, setEditingNotes] = useState<boolean>(false)
  const [editedNotes, setEditedNotes] = useState<string>('')
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false)

  const { readingId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const pdfRef = useRef<HTMLDivElement | null>(null)

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
  } = useAnnotationSelection(pdfRef, reading)

  const { handleHide, handleStrikethrough, handleHighlight, handleNote, handleDeleteAnnotationNote, handleEditAnnotationNote } = useAnnotations({
    readingId,
    token,
    reading,
    setReading,
    showAlert,
    clearSelectionToolbar,
    persistRemotely: true,
  })

  useEffect(() => {
    if (location.state?.scrollUp && reading !== null) {
        document.getElementById('scrollTop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // Consume the flag so later `reading` updates on this same page (e.g.
        // saving a note, which also changes the `reading` reference) don't
        // re-trigger this scroll — it should only fire once, right after the
        // navigation that set scrollUp.
        navigate('.', { replace: true, state: {}, relative: 'path' })
    }
    }, [reading, location.state, navigate])

  // Load all reference data (spreads/relations) and the reading itself
  // concurrently, since none of them depend on each other. Cards/decks come
  // from App-level state instead of being fetched here.
  useEffect(() => {
    if (!token) {
      console.error('No token found')
      return
    }

    setLoading(true)
    ;(async () => {
      try {
        const [spreadsData, relationsData, readingData] = await Promise.all([
          fetch('/api/spreads').then(res => res.json()),
          fetch('/api/relations').then(res => res.json()),
          authFetch<Reading>(`/api/readings/${readingId}`, token),
        ])

        setSpreads(spreadsData)
        setRelations(relationsData)
        setReading(readingData)
        if (readingData?.notes) setEditedNotes(readingData.notes)
      } catch (err) {
        console.error('Failed to load reading data:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [token, readingId])

  const handleSaveNotes = async (newNotes: string) => {
    try {
      const updatedReading = await authFetch<Reading>(`/api/readings/${readingId}/updateNotes`, token, {
        method: 'POST',
        body: JSON.stringify({ notes: newNotes }),
      })
      setReading(updatedReading)
      setEditingNotes(false)
    } catch (err) {
      console.error('Failed to save notes:', err)
      showAlert('Failed to save notes. Please try again.')
    }
  }

  const handleDownloadPDF = async () => {
    const readingDeck = reading ? decks.find(d => d.id === reading.deckId) ?? null : null
    if (!reading || !readingDeck) {
      showAlert('Cannot generate PDF. Please try again.')
      return
    }

    try {
      await exportReadingToPdfNative(
        { reading, cards, spreads, relations, selectedDeck: readingDeck },
        `${reading.name || 'tarot-reading'}.pdf`
      )
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      showAlert('Failed to generate PDF. Please try again.')
    }
  }

  const spread = spreads.find(s => s.id === reading?.spread)
  if (!reading) return

  // Card descriptions/images always resolve against the deck pinned to this
  // reading at creation time, not whichever deck is currently equipped —
  // otherwise annotation offsets (anchored to the deck-specific description
  // text) drift out of sync with what's rendered.
  const readingDeck = decks.find(d => d.id === reading.deckId) ?? null

  const activeAnnotation = pendingSelection
    ? findAnnotationAtSelection(reading.annotations, pendingSelection.targetId, pendingSelection.startOffset, pendingSelection.endOffset)
    : undefined

  const isHiddenActive = pendingSelection
    ? isRangeFullyHideMode(reading.annotations, pendingSelection.targetId, pendingSelection.startOffset, pendingSelection.endOffset, 'hidden')
    : false
  const isStrikethroughActive = pendingSelection
    ? isRangeFullyHideMode(reading.annotations, pendingSelection.targetId, pendingSelection.startOffset, pendingSelection.endOffset, 'strikethrough')
    : false
  const isHighlightActive = !!activeAnnotation?.highlightColor
  const isNoteActive = !!activeAnnotation?.note
  const focusedAnnotationId = activeAnnotation?.id ?? null

  return (
    <div className="panel">
      <div className="panelTitle">
        <button className="infoBtn" onClick={() => setShowInfoModal(true)}>
          <FontAwesomeIcon icon={faCircleInfo} />
        </button>
        <h2>{reading.name}</h2>
        <span className="infoBtn" style={{ backgroundColor: 'transparent' }} />
      </div>

      <div className="innerCardImgs" id="scrollTop">
        {reading.cards.map((cardId, idx) => {
          const card = cards.find(c => c.id === cardId)
          if (!card) return null

          return (
            <div key={cardId} className="cardImgInnerBorder">
              <div className="cardEffectLayer">
                <div className="cardBackOverlayWrapper">
                  <div className="innerCardImg cardAspect" />
                  <div className="cardBackTextWrapper">
                    <img
                      src={`${readingDeck?.images['card-front']}/${card.type.replaceAll(' ', '')}/${card.nameShort}.png`}
                      className={reading.reversalValues[idx] === true ? 'innerSpreadImg upside-down' : 'innerSpreadImg'}
                      alt={`Deck card ${card.name}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="cardDescription">
        <div style={{ display: 'flex', columnGap: '1rem' }}>
            <button onClick={handleDownloadPDF} className="mainBtn getReadingBtn">Download</button>
            {readingDeck && selectedDeck?.id !== readingDeck.id && (
                <button onClick={() => setUserSelectedDeck(readingDeck.id)} className="mainBtn getReadingBtn">Select deck</button>
            )}
        </div>
        <TableOfContents items={buildReadingToc(reading, cards, spreads, relations)} />

        <div
          className="readingMainColumn"
          ref={pdfRef}
          onMouseUp={handleTextSelection}
          onMouseDown={handleContainerMouseDown}
        >
          {reading.cards.map((cardId, i) => {
            if (!cardId) return null
            const card = cards.find(c => c.id === cardId)
            if (!card || !spread) return null

            return (
              <ReadingCardSection
                key={i}
                index={i}
                card={card}
                spread={spread}
                reading={reading}
                selectedDeck={readingDeck}
                annotations={reading.annotations}
                onDeleteNote={handleDeleteAnnotationNote}
                onEditNote={handleEditAnnotationNote}
                onSelectAnnotation={selectAnnotationAndOpenToolbar}
                focusedAnnotationId={focusedAnnotationId}
                isMobile={isMobile}
              />
            )
          })}

          {spread !== undefined && spread.numPulls > 1 && (
            <CombinedRelationsSection
              reading={reading}
              relations={relations}
              cards={cards}
              annotations={reading.annotations}
              onDeleteNote={handleDeleteAnnotationNote}
              onEditNote={handleEditAnnotationNote}
              isMobile={isMobile}
              onSelectAnnotation={selectAnnotationAndOpenToolbar}
              focusedAnnotationId={focusedAnnotationId}
            />
          )}

          <NotesSection
            notes={reading.notes}
            editing={editingNotes}
            editedNotes={editedNotes}
            onStartEdit={() => setEditingNotes(true)}
            onChangeEditedNotes={setEditedNotes}
            onSave={handleSaveNotes}
          />
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

      <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
            <InfoPage
            infoMessages={[
                `Welcome to the Reading Page!`,
                `This reading uses the deck it was created with, not necessarily your currently selected deck — the cards and descriptions shown always match that original deck.`,
                `If the reading's deck differs from your currently selected one, a button lets you select it directly from here.`,
                `Select text anywhere in the reading to hide, strike through, highlight, or add a note — a popup menu appears with your options. Headings and selections spanning more than one section can't be annotated. Adding a note always applies a highlight too; choose from 5 highlight colors. Notes appear in a small column next to the text they're attached to.`,
                `A general notes section is also available at the bottom — click Edit Notes to add or update your thoughts and interpretations.`,
                `Click Download at the top of the reading to save it as a PDF.`,
            ]}
            />
      </Modal>
    </div>
  )
}

export default ReadingPanel