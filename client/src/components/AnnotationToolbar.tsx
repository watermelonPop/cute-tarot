import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEyeSlash, faStrikethrough, faHighlighter, faPencil } from '@fortawesome/free-solid-svg-icons'
import type { Annotation } from '../types'
import { HIGHLIGHT_COLORS } from '../lib/annotation/colors'
import type { PendingSelection } from '../hooks/useAnnotationSelection'
import HighlightColorModal from './HighlightColorModal'
import NoteModal from './NoteModal'
import './AnnotationToolbar.css'

interface AnnotationToolbarProps {
  pendingSelection: PendingSelection
  toolbarRef: RefObject<HTMLDivElement | null>
  activeAnnotation: Annotation | undefined
  isHiddenActive: boolean
  isStrikethroughActive: boolean
  isHighlightActive: boolean
  isNoteActive: boolean
  highlightSubmenuOpen: boolean
  setHighlightSubmenuOpen: (open: boolean) => void
  noteSubmenuOpen: boolean
  setNoteSubmenuOpen: (open: boolean) => void
  onHide: () => void
  onStrikethrough: () => void
  onHighlight: (color?: string) => void
  onSaveNote: (noteText: string) => void
  isMobile?: () => boolean
}

function AnnotationToolbar({
  pendingSelection,
  toolbarRef,
  activeAnnotation,
  isHiddenActive,
  isStrikethroughActive,
  isHighlightActive,
  isNoteActive,
  highlightSubmenuOpen,
  setHighlightSubmenuOpen,
  noteSubmenuOpen,
  setNoteSubmenuOpen,
  onHide,
  onStrikethrough,
  onHighlight,
  onSaveNote,
  isMobile,
}: AnnotationToolbarProps) {
  const [noteDraft, setNoteDraft] = useState(activeAnnotation?.note ?? '')
  const mobile = isMobile?.() ?? false

  // Desktop submenus default to opening on the toolbar's right (see
  // AnnotationToolbar.css), but that overflows off-screen for a selection
  // near the right edge. alignLeft flips a submenu to open on the left
  // instead once it's known to not fit. A submenu's intrinsic width doesn't
  // depend on which side it's rendered on, so this can be decided in a
  // single measurement pass — no flicker/reset dance needed.
  const [highlightAlignLeft, setHighlightAlignLeft] = useState(false)
  const [noteAlignLeft, setNoteAlignLeft] = useState(false)
  const highlightSubmenuRef = useRef<HTMLDivElement | null>(null)
  const noteSubmenuRef = useRef<HTMLDivElement | null>(null)

  const decideAlign = (submenuEl: HTMLDivElement | null, setAlignLeft: (left: boolean) => void) => {
    const toolbarEl = toolbarRef.current
    if (!submenuEl || !toolbarEl) return
    const toolbarRight = toolbarEl.getBoundingClientRect().right
    const SUBMENU_GAP_PX = 8 // matches the CSS 0.5rem gap between toolbar and submenu
    setAlignLeft(toolbarRight + SUBMENU_GAP_PX + submenuEl.offsetWidth > window.innerWidth)
  }

  useLayoutEffect(() => {
    if (mobile || !highlightSubmenuOpen || isHiddenActive) return
    decideAlign(highlightSubmenuRef.current, setHighlightAlignLeft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, highlightSubmenuOpen, isHiddenActive, pendingSelection.targetId, pendingSelection.startOffset, pendingSelection.endOffset])

  useLayoutEffect(() => {
    if (mobile || !noteSubmenuOpen || isHiddenActive) return
    decideAlign(noteSubmenuRef.current, setNoteAlignLeft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, noteSubmenuOpen, isHiddenActive, pendingSelection.targetId, pendingSelection.startOffset, pendingSelection.endOffset])

  // Refill the draft from the stored note each time the submenu is opened
  // (not on every keystroke — this only depends on the open flag and the
  // selection identity, so typing doesn't get clobbered mid-edit).
  useEffect(() => {
    if (noteSubmenuOpen) {
      setNoteDraft(activeAnnotation?.note ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteSubmenuOpen, pendingSelection.targetId, pendingSelection.startOffset, pendingSelection.endOffset])

  const openNoteSubmenu = () => {
    if (isNoteActive) return
    setHighlightSubmenuOpen(false)
    setNoteSubmenuOpen(true)
  }

  const handleCancelNote = () => {
    setNoteSubmenuOpen(false)
  }

  const handleSaveNote = () => {
    onSaveNote(noteDraft)
    setNoteSubmenuOpen(false)
  }

  return (
    <div
      ref={toolbarRef}
      className="annotationToolbar"
      style={{
        position: 'fixed',
        top: pendingSelection.toolbarY,
        left: pendingSelection.toolbarX,
        transform: 'translate(-50%, calc(-100% - 8px))',
      }}
    >
      <button className={`annotationToolbarBtn${isHiddenActive ? ' active' : ''}`} onClick={onHide}>
        <FontAwesomeIcon icon={faEyeSlash} />Hide
      </button>

      <button
        className={`annotationToolbarBtn${isStrikethroughActive ? ' active' : ''}`}
        onClick={onStrikethrough}
        disabled={isHiddenActive}
      >
        <FontAwesomeIcon icon={faStrikethrough} />Strikethrough
      </button>

      <div
        className="annotationToolbarItem"
        onMouseEnter={() => { if (!mobile && !isHiddenActive) { setNoteSubmenuOpen(false); setHighlightSubmenuOpen(true) } }}
        onMouseLeave={() => { if (!mobile) setHighlightSubmenuOpen(false) }}
      >
        <button
          className={`annotationToolbarBtn${isHighlightActive ? ' active' : ''}`}
          onClick={() => {
            // Desktop: click applies the default color immediately, hover
            // is what surfaces the swatch submenu for picking a different
            // one. Mobile has no hover, so click instead just opens the
            // color-picker modal — a color choice is required there to
            // actually apply anything.
            if (mobile) {
              setNoteSubmenuOpen(false)
              setHighlightSubmenuOpen(!highlightSubmenuOpen)
            } else {
              onHighlight()
            }
          }}
          disabled={isHiddenActive}
        >
          <FontAwesomeIcon icon={faHighlighter} />Highlight
        </button>
        {!mobile && highlightSubmenuOpen && !isHiddenActive && (
          <div ref={highlightSubmenuRef} className={`annotationSubmenu${highlightAlignLeft ? ' alignLeft' : ''}`}>
            {HIGHLIGHT_COLORS.map(({ label, value }) => (
              <button
                key={value}
                className={`annotationSwatchBtn${activeAnnotation?.highlightColor === value ? ' active' : ''}`}
                style={{ backgroundColor: value }}
                title={label}
                onClick={() => onHighlight(value)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="annotationToolbarItem">
        <button
          className={`annotationToolbarBtn${isNoteActive ? ' active' : ''}`}
          onClick={openNoteSubmenu}
          disabled={isHiddenActive}
        >
          <FontAwesomeIcon icon={faPencil} />Note
        </button>
        {!mobile && noteSubmenuOpen && !isHiddenActive && (
          <div ref={noteSubmenuRef} className={`annotationSubmenu annotationNoteSubmenu${noteAlignLeft ? ' alignLeft' : ''}`}>
            <textarea
              className="annotationNoteTextarea"
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder="Add a note..."
              autoFocus
            />
            <div className="annotationNoteSubmenuActions">
              <button className="annotationNoteCancelBtn" onClick={handleCancelNote}>Cancel</button>
              <button className="annotationNoteSaveBtn" onClick={handleSaveNote}>Save</button>
            </div>
          </div>
        )}
      </div>

      {mobile && (
        <HighlightColorModal
          showModal={highlightSubmenuOpen && !isHiddenActive}
          setShowModal={setHighlightSubmenuOpen}
          activeColor={activeAnnotation?.highlightColor}
          noHighlightDisabled={isNoteActive}
          onSelectColor={color => onHighlight(color)}
        />
      )}

      {mobile && (
        <NoteModal
          showModal={noteSubmenuOpen && !isHiddenActive}
          setShowModal={setNoteSubmenuOpen}
          initialNote={activeAnnotation?.note ?? ''}
          onSave={onSaveNote}
        />
      )}
    </div>
  )
}

export default AnnotationToolbar