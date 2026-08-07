import { forwardRef, useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faPencil, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { Annotation } from '../types'

const EXCERPT_MAX_LENGTH = 90

function excerpt(text: string): string {
  const trimmed = text.trim()
  return trimmed.length > EXCERPT_MAX_LENGTH ? `${trimmed.slice(0, EXCERPT_MAX_LENGTH).trimEnd()}…` : trimmed
}

interface NoteCardProps {
  annotation: Annotation
  onJumpTo: () => void
  onDelete: () => void
  onSaveEdit: (newText: string) => void
  focused?: boolean
  style?: CSSProperties
}

const NoteCard = forwardRef<HTMLDivElement, NoteCardProps>(function NoteCard(
  { annotation, onJumpTo, onDelete, onSaveEdit, focused, style },
  ref
) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(annotation.note ?? '')

  // Keep the draft in sync if the underlying note changes from outside
  // (e.g. another save) while this card isn't actively being edited.
  useEffect(() => {
    if (!editing) setDraft(annotation.note ?? '')
  }, [annotation.note, editing])

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft(annotation.note ?? '')
    setEditing(true)
  }

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSaveEdit(draft)
    setEditing(false)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft(annotation.note ?? '')
    setEditing(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div className={`noteCard${focused ? ' focused' : ''}`} style={style} ref={ref} onClick={onJumpTo}>
      <div className="noteCardActions">
        {editing ? (
          <>
            <button
              type="button"
              className="noteCardActionBtn"
              onClick={handleDelete}
              aria-label="Delete note"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
            <button
              type="button"
              className="noteCardActionBtn"
              onClick={handleSave}
              aria-label="Save note"
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
            <button
              type="button"
              className="noteCardActionBtn"
              onClick={handleCancel}
              aria-label="Cancel editing"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="noteCardActionBtn noteCardEditBtn"
            onClick={startEdit}
            aria-label="Edit note"
          >
            <FontAwesomeIcon icon={faPencil} />
          </button>
        )}
      </div>

      <p
        className="noteCardQuote"
        style={annotation.highlightColor ? { borderLeftColor: annotation.highlightColor } : undefined}
        title="Jump to this passage"
      >
        “{excerpt(annotation.text)}”
      </p>

      {editing ? (
        <textarea
          className="noteCardBodyEdit"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onClick={e => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <p className="noteCardBody">{annotation.note}</p>
      )}
    </div>
  )
})

export default NoteCard