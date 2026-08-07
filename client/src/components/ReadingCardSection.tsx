import type { Reading, Deck, Spread, Card, Annotation } from '../types'
import AnnotatedSection from './AnnotatedSection'
import { getCardTopicMeaning } from '../lib/readingHelpers'

interface ReadingCardSectionProps {
  index: number
  card: Card
  spread: Spread
  reading: Reading
  selectedDeck: Deck | null
  annotations: Annotation[]
  onDeleteNote: (annotationId: string) => void
  onSelectAnnotation: (annotation: Annotation) => void
  focusedAnnotationId: string | null
  onEditNote?: (annotationId: string, newText: string) => void
  isMobile?: () => boolean
}

function ReadingCardSection({
  index: i, card, spread, reading, selectedDeck, annotations,
  onDeleteNote, onSelectAnnotation, focusedAnnotationId, onEditNote, isMobile
}: ReadingCardSectionProps) {
  const isReversed = reading.reversals === true && reading.reversalValues[i] === true
  const topicMeaning = getCardTopicMeaning(card, reading.topic)

  return (
    <div className="readingResultCard">
      <h3 id={`cardTitle${i}`} className="sectionHeading">
        {spread.pulls[i]}: {card.name}
      </h3>

      <AnnotatedSection
        headingId={`cardDesc${i}`}
        heading="Description"
        targetId={`cardDesc${i}`}
        text={card.descriptions[selectedDeck!.id]}
        annotations={annotations}
        onDeleteNote={onDeleteNote}
        onSelectAnnotation={onSelectAnnotation}
        focusedAnnotationId={focusedAnnotationId}
        onEditNote={onEditNote}
        isMobile={isMobile}
      />

      <AnnotatedSection
        headingId={`cardMeaning${i}`}
        heading={isReversed ? 'Meaning (Reversed)' : 'Meaning (Upright)'}
        targetId={`cardMeaning${i}`}
        text={isReversed ? card.meaningRev : card.meaningUp}
        annotations={annotations}
        onDeleteNote={onDeleteNote}
        onSelectAnnotation={onSelectAnnotation}
        focusedAnnotationId={focusedAnnotationId}
        onEditNote={onEditNote}
        isMobile={isMobile}
      />

      {reading.topic !== 'General' && topicMeaning && (
        <AnnotatedSection
          headingId={`cardSpecMeaning${i}`}
          heading={`Meaning for ${reading.topic}`}
          targetId={`cardSpecMeaning${i}`}
          text={topicMeaning}
          annotations={annotations}
          onDeleteNote={onDeleteNote}
          onSelectAnnotation={onSelectAnnotation}
          focusedAnnotationId={focusedAnnotationId}
          beforeBody={isReversed && <p className="reversedReminder">Remember: This card is reversed! Negate the following meaning.</p>}
          onEditNote={onEditNote}
          isMobile={isMobile}
        />
      )}

      {spread.name === 'Yes or No' && (
        <AnnotatedSection
          headingId="cardYesNo"
          heading="Finally: Yes or No?"
          targetId="cardYesNo"
          text={card.meaningYesNo}
          annotations={annotations}
          onDeleteNote={onDeleteNote}
          onSelectAnnotation={onSelectAnnotation}
          focusedAnnotationId={focusedAnnotationId}
          beforeBody={isReversed && <p className="reversedReminder">Remember: This card is reversed! Negate the following meaning.</p>}
          onEditNote={onEditNote}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}

export default ReadingCardSection