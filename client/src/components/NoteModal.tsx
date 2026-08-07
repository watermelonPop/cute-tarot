import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './NoteModal.css'
import MiniModal from './MiniModal'

interface NoteModalProps {
    showModal: boolean
    setShowModal: (show: boolean) => void
    initialNote: string
    onSave: (noteText: string) => void
}

export default function NoteModal({ showModal, setShowModal, initialNote, onSave }: NoteModalProps) {
    const [draft, setDraft] = useState(initialNote)

    // Refill the draft from the stored note each time the modal opens, same
    // as the desktop submenu does — not on every keystroke.
    useEffect(() => {
        if (showModal) setDraft(initialNote)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showModal])

    if (!showModal) return null

    const handleSave = () => {
        onSave(draft)
        setShowModal(false)
    }

    // Ported to document.body — see HighlightColorModal for why: the
    // AnnotationToolbar parent's inline `transform` makes it the containing
    // block for `position: fixed` descendants otherwise.

    return createPortal(
        <>
            <MiniModal title={"Add Note"} showModal={showModal} setShowModal={setShowModal} buttons={
                <>
                    <button className="note-modal-btn note-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="note-modal-btn note-modal-save" onClick={handleSave}>Save</button>
                </>
            } >
                <textarea
                    className="note-modal-textarea"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Add a note..."
                    autoFocus
                />
            </MiniModal>
        </>
        ,
        document.body
    )
}
