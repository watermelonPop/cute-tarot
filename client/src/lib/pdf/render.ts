import type { JsPdfInstance } from './jspdf'
import type { Ctx } from './context'
import { ensureSpace } from './context'
import type { PdfExportData } from './data'
import type { LoadedCardImage } from './images'
import { buildDescSideImage, getReadingCardCount } from './images'
import { writeHeading, writeSubHeadingPill } from './headings'
import { writeCardImagesSection } from './cardImages'
import { writeAnnotatedSection } from './notes'
import { wrapPlainText } from './textUtils'
import { getCardTopicMeaning, getRelationCardNames, getRelationTopicDescription } from '../readingHelpers'
import {
  CARD_SECTION_HEADING_ID,
  SECTION_GAP_MM,
  FONT_BODY_PT,
  LINE_HEIGHT_MM,
  COLOR_BLACK,
  DEFAULT_READING_TITLE,
} from './constants'

export function renderContent(doc: JsPdfInstance, ctx: Ctx, data: PdfExportData, images: Map<number, LoadedCardImage>): void {
  const { reading, cards, spreads, relations, selectedDeck } = data
  const spread = spreads.find(s => s.id === reading.spread)
  const annotations = reading.annotations

  const cardCount = getReadingCardCount(data)
  writeHeading(doc, ctx, `Reading: ${reading.name || DEFAULT_READING_TITLE}`, 1, undefined, true)
  writeSubHeadingPill(doc, ctx, `${cardCount} Card${cardCount === 1 ? '' : 's'}`, CARD_SECTION_HEADING_ID)
  writeCardImagesSection(doc, ctx, data, images, spread)

  reading.cards.forEach((cardId, i) => {
    if (!cardId || !spread) return
    const card = cards.find(c => c.id === cardId)
    if (!card) return

    const isReversed = reading.reversals === true && reading.reversalValues[i] === true
    const topicMeaning = getCardTopicMeaning(card, reading.topic)

    writeHeading(doc, ctx, `${spread.pulls[i]}: ${card.name}`, 2, `cardTitle${i}`)

    const image = images.get(i)
    writeAnnotatedSection(
        doc, ctx, `cardDesc${i}`, 'Description', `cardDesc${i}`, card.descriptions[selectedDeck!.id], annotations,
        undefined,
        image ? buildDescSideImage(image) : undefined
    )

    writeAnnotatedSection(
      doc, ctx, `cardMeaning${i}`,
      isReversed ? 'Meaning (Reversed)' : 'Meaning (Upright)',
      `cardMeaning${i}`,
      isReversed ? card.meaningRev : card.meaningUp,
      annotations
    )

    if (reading.topic !== 'General' && topicMeaning) {
      writeAnnotatedSection(
        doc, ctx, `cardSpecMeaning${i}`, `Meaning for ${reading.topic}`, `cardSpecMeaning${i}`, topicMeaning, annotations,
        isReversed ? 'Remember: This card is reversed! Negate the following meaning.' : undefined
      )
    }

    if (spread.name === 'Yes or No') {
      writeAnnotatedSection(
        doc, ctx, 'cardYesNo', 'Finally: Yes or No?', 'cardYesNo', card.meaningYesNo, annotations,
        isReversed ? 'Remember: This card is reversed! Negate the following meaning.' : undefined
      )
    }

    ctx.y += SECTION_GAP_MM
  })

  if (spread !== undefined && spread.numPulls > 1) {
    writeHeading(doc, ctx, 'Combined', 2, 'combined')

    reading.relations.forEach((relationId, rIdx) => {
      if (!relationId) return
      const relation = relations.find(r => r.id === relationId)
      if (!relation) return

      const cardNames = getRelationCardNames(relation, cards)
      const topicDescription = getRelationTopicDescription(relation, reading.topic)

      writeAnnotatedSection(doc, ctx, `relationName${rIdx}`, cardNames, `relationDesc${rIdx}`, relation.description, annotations)

      if (reading.topic !== 'General' && topicDescription) {
        writeAnnotatedSection(doc, ctx, `relationSpecMeaning${rIdx}`, `${cardNames} in ${reading.topic}`, `relationSpecMeaning${rIdx}`, topicDescription, annotations)
      }
    })

    ctx.y += SECTION_GAP_MM
  }

  writeHeading(doc, ctx, 'Notes', 2, 'notes')
  doc.setFont('times', 'normal')
  doc.setFontSize(FONT_BODY_PT)
  doc.setTextColor(...COLOR_BLACK)
  const notesLines = wrapPlainText(doc, reading.notes ? reading.notes : 'No notes.', ctx.contentWidth)
  for (const line of notesLines) {
    ensureSpace(doc, ctx, LINE_HEIGHT_MM)
    ctx.y += LINE_HEIGHT_MM
    doc.text(line, ctx.x, ctx.y)
  }
}
