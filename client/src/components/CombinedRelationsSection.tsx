import type { Reading, Relation, Card, Annotation } from '../types'
import AnnotatedSection from './AnnotatedSection'
import { getRelationCardNames, getRelationTopicDescription } from '../lib/readingHelpers'

interface CombinedRelationsSectionProps {
  reading: Reading
  relations: Relation[]
  cards: Card[]
  annotations: Annotation[]
  onDeleteNote: (annotationId: string) => void
  onSelectAnnotation: (annotation: Annotation) => void
  focusedAnnotationId: string | null
  onEditNote?: (annotationId: string, newText: string) => void
  isMobile?: () => boolean
}

function CombinedRelationsSection({
  reading, relations, cards, annotations,
  onDeleteNote, onSelectAnnotation, focusedAnnotationId, onEditNote, isMobile
}: CombinedRelationsSectionProps) {
  return (
    <>
      <h3 id="combined" className="sectionHeading">Combined</h3>

      {reading?.relations.map((relationId, rIdx) => {
        if (!relationId) return null

        const relation = relations.find(r => r.id === relationId)
        if (!relation) return null

        const cardNames = getRelationCardNames(relation, cards)
        const topicDescription = getRelationTopicDescription(relation, reading.topic)

        return (
          <div key={rIdx} className="combinedRelation">
            <AnnotatedSection
              headingId={`relationName${rIdx}`}
              heading={cardNames}
              targetId={`relationDesc${rIdx}`}
              text={relation.description}
              annotations={annotations}
              onDeleteNote={onDeleteNote}
              onSelectAnnotation={onSelectAnnotation}
              focusedAnnotationId={focusedAnnotationId}
              onEditNote={onEditNote}
              isMobile={isMobile}
            />

            {reading.topic !== 'General' && topicDescription && (
              <AnnotatedSection
                headingId={`relationSpecMeaning${rIdx}`}
                heading={`${cardNames} in ${reading.topic}`}
                targetId={`relationSpecMeaning${rIdx}`}
                text={topicDescription}
                annotations={annotations}
                onDeleteNote={onDeleteNote}
                onSelectAnnotation={onSelectAnnotation}
                focusedAnnotationId={focusedAnnotationId}
                onEditNote={onEditNote}
                isMobile={isMobile}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

export default CombinedRelationsSection