import type { Reading, Relation, Spread, Card } from '../types'
import type { TocItem } from '../components/TableOfContents'

/**
 * Resolves the topic-specific meaning text for a card, or undefined if the
 * topic has no dedicated meaning (e.g. 'General', or a topic whose field is
 * empty). Centralizes the topic -> field mapping used by both the TOC
 * builder and the reading render.
 */
export function getCardTopicMeaning(card: Card, topic: Reading['topic']): string | undefined {
  if (topic === 'Advice') return card.meaningAdvice || undefined
  if (topic === 'Love & Relationships') return card.meaningLove || undefined
  if (topic === 'Career') return card.meaningCareer || undefined
  return undefined
}

/** Same mapping as getCardTopicMeaning, for a card-pair relation's description. */
export function getRelationTopicDescription(relation: Relation, topic: Reading['topic']): string | undefined {
  if (topic === 'Advice') return relation.descriptionAdvice || undefined
  if (topic === 'Love & Relationships') return relation.descriptionLove || undefined
  if (topic === 'Career') return relation.descriptionCareer || undefined
  return undefined
}

/** Joins the card names in a relation, e.g. "The Fool & The Tower". */
export function getRelationCardNames(relation: Relation, cards: Card[]): string {
  return relation.cards
    .map(cardId => cards.find(c => c.id === cardId)?.name ?? 'Unknown card')
    .join(' & ')
}

export function buildReadingToc(
  reading: Reading,
  cards: Card[],
  spreads: Spread[],
  relations: Relation[]
): TocItem[] {
  const spread = spreads.find(s => s.id === reading.spread)
  const items: TocItem[] = []

  if (reading.cards.length > 0) {
    reading.cards.forEach((cardId, i) => {
      if (!cardId) return

      const card = cards.find(c => c.id === cardId)
      if (!card || !spread) return

      const topicMeaning = getCardTopicMeaning(card, reading.topic)

      const children: TocItem[] = [
        { label: 'Description', targetId: `cardDesc${i}` },
        {
          label: reading.reversals === true && reading.reversalValues[i] === true
            ? 'Meaning (Reversed)'
            : 'Meaning (Upright)',
          targetId: `cardMeaning${i}`,
        },
      ]

      if (reading.topic !== 'General' && topicMeaning) {
        children.push({ label: `Meaning for ${reading.topic}`, targetId: `cardSpecMeaning${i}` })
      }

      if (spread.name === 'Yes or No') {
        children.push({ label: 'Finally: Yes or No?', targetId: 'cardYesNo' })
      }

      items.push({
        label: `${spread.pulls[i]}: ${card.name}`,
        targetId: `cardTitle${i}`,
        children,
      })
    })
  }

  if (spread && spread.numPulls > 1) {
    const relationChildren: TocItem[] = []

    if (reading.relations.length > 0) {
      reading.relations.forEach((relationId, rIdx) => {
        const relation = relations.find(r => r.id === relationId)
        if (!relation) return

        const cardNames = getRelationCardNames(relation, cards)
        const topicDescription = getRelationTopicDescription(relation, reading.topic)

        const grandchildren: TocItem[] = []

        if (reading.topic !== 'General' && topicDescription) {
          grandchildren.push({
            label: `${cardNames} in ${reading.topic}`,
            targetId: `relationSpecMeaning${rIdx}`,
          })
        }

        relationChildren.push({
          label: cardNames,
          targetId: `relationName${rIdx}`,
          children: grandchildren,
        })
      })
    }

    items.push({
      label: 'Combined',
      targetId: 'combined',
      children: relationChildren,
    })
  }

  items.push({ label: 'Notes', targetId: 'notes' })

  return items
}