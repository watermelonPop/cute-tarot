interface NotesSectionProps {
  notes: string | undefined
  editing: boolean
  editedNotes: string
  onStartEdit: () => void
  onChangeEditedNotes: (value: string) => void
  onSave: (notes: string) => void
}

function NotesSection({ notes, editing, editedNotes, onStartEdit, onChangeEditedNotes, onSave }: NotesSectionProps) {
  return (
    <>
      <h3 id="notes" className="sectionHeading">Notes</h3>
      {editing === false ? (
        <div className="combinedRelation">
          <p className="readingParagraph">{notes ? notes : 'No notes.'}</p>
          <button className="mainBtn" onClick={onStartEdit}>Edit Notes</button>
        </div>
      ) : (
        <div className="combinedRelation">
          <textarea
            className="editNotesText"
            value={editedNotes}
            onChange={e => onChangeEditedNotes(e.target.value)}
          />
          <button className="mainBtn" onClick={() => onSave(editedNotes)}>Save Changes</button>
        </div>
      )}
    </>
  )
}

export default NotesSection