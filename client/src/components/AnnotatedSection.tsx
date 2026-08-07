import { useRef, useState } from 'react'
import type { Annotation } from '../types'
import AnnotatedText from './AnnotatedText'
import NotesPanel from './NotesPanel'

interface AnnotatedSectionProps {
  headingId: string
  heading: React.ReactNode
  targetId: string
  text: string
  annotations: Annotation[]
  onDeleteNote: (annotationId: string) => void
  onSelectAnnotation: (annotation: Annotation) => void
  focusedAnnotationId: string | null
  beforeBody?: React.ReactNode
  onEditNote?: (annotationId: string, newText: string) => void
  isMobile?: () => boolean
}

function AnnotatedSection({
  headingId,
  heading,
  targetId,
  text,
  annotations,
  onDeleteNote,
  onSelectAnnotation,
  focusedAnnotationId,
  beforeBody,
  onEditNote,
  isMobile
}: AnnotatedSectionProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const [notesPanelHeight, setNotesPanelHeight] = useState(0)

  const safeAnnotations = annotations ?? []
  const sectionAnnotations = safeAnnotations.filter(a => a.targetId === targetId)
  const hasNotes = sectionAnnotations.some(a => !!a.note)
  const mobile = isMobile?.() ?? false
  // On mobile, notes render inline (block-level) directly under their
  // passage instead of in the absolutely-positioned side rail — a <p> can't
  // legally contain the block-level note card, so the wrapping element
  // becomes a <div> in that mode (same class, same visual text styling).
  const ParagraphTag = mobile ? 'div' : 'p'

  return (
    <div className="annotatedSection">
      <h4 id={headingId} className="subHeading">{heading}</h4>
      {beforeBody}

      <div
        className="annotatedSectionBody"
        ref={sectionRef}
        style={{ minHeight: mobile ? undefined : notesPanelHeight }}
      >
        <ParagraphTag
          className={`readingParagraph${hasNotes && !mobile ? ' withNotesPanel' : ''}`}
          data-target-id={targetId}
        >
          <AnnotatedText
            text={text}
            targetId={targetId}
            annotations={safeAnnotations}
            inlineNotes={mobile}
            onDeleteNote={onDeleteNote}
            onEditNote={onEditNote}
          />
        </ParagraphTag>

        {!mobile && (
          <NotesPanel
            annotations={sectionAnnotations}
            onDeleteNote={onDeleteNote}
            onSelectAnnotation={onSelectAnnotation}
            focusedAnnotationId={focusedAnnotationId}
            containerRef={sectionRef}
            onEditNote={onEditNote}
            onHeightChange={setNotesPanelHeight}
          />
        )}
      </div>
    </div>
  )
}

export default AnnotatedSection