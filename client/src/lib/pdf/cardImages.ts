import type { JsPdfInstance } from './jspdf'
import type { Ctx } from './context'
import { ensureSpace } from './context'
import type { PdfExportData } from './data'
import type { LoadedCardImage } from './images'
import { drawRoundedImage } from './images'
import { drawCardLabel } from './headings'
import type { Spread } from '../../types'
import {
  COLOR_GRAY,
  CARD_SECTION_TOP_GAP_MM,
  CARD_COLUMN_GAP_MM,
  CARD_BOX_PADDING_MM,
  CARD_LABEL_FONT_PT,
  CARD_LABEL_PADDING_MM,
  SECTION_GAP_MM,
} from './constants'

/**
 * Draws the card-images section: heading ("{N} Cards"), then N equal
 * columns spanning the full content width, each a bordered box (approximating
 * .cardImgInnerBorder's accent-background + rounded-corner look) containing
 * that card's image, aspect-correct and centered within the box. Reversed
 * cards are rotated 180deg. Height is fixed to a third of the full page
 * height regardless of how many cards there are or whether their images
 * loaded successfully.
 */
export function writeCardImagesSection(doc: JsPdfInstance, ctx: Ctx, data: PdfExportData, images: Map<number, LoadedCardImage>, spread: Spread | undefined): void {
  const { reading, cards } = data
  const validIndices = reading.cards
    .map((cardId, idx) => ({ cardId, idx }))
    .filter(({ cardId }) => !!cardId && cards.some(c => c.id === cardId))
    .map(({ idx }) => idx)

  const n = validIndices.length
  if (n === 0) return

  ctx.y += CARD_SECTION_TOP_GAP_MM

  const sectionHeight = ctx.pageHeight / 3
    ensureSpace(doc, ctx, sectionHeight)

    const columnWidth = (ctx.contentWidth - (n - 1) * CARD_COLUMN_GAP_MM) / n
    const boxTop = ctx.y

  validIndices.forEach((idx, i) => {
    const columnX = ctx.x + i * (columnWidth + CARD_COLUMN_GAP_MM)

    const labelLineH = CARD_LABEL_FONT_PT * 0.3528 * 1.3
    const labelBandHeight = labelLineH + CARD_LABEL_PADDING_MM * 2
    // Image area sits between the two label bands, not the full box.
    const maxInnerWidth = columnWidth - CARD_BOX_PADDING_MM * 2
    const contentTop = boxTop + CARD_BOX_PADDING_MM + labelBandHeight
    const contentBottom = boxTop + sectionHeight - CARD_BOX_PADDING_MM - labelBandHeight
    const maxInnerHeight = contentBottom - contentTop

    const image = images.get(idx)
    const cardId = reading.cards[idx]
    const card = cards.find(c => c.id === cardId)

    // Aspect-fit the image within the column's available space first, then
    // size the visible box tightly around THAT — not the other way around.
    // Sizing the box to the full column and centering a letterboxed image
    // inside it (the old approach) left equal padding only on the axis that
    // happened to be the tighter constraint; portrait card art is normally
    // height-constrained here, which left the sides with much more padding
    // than the top/bottom. Hugging the box to the actual image bounds keeps
    // CARD_BOX_PADDING_MM uniform on every side, always.
    let drawWidth = maxInnerWidth
    let drawHeight = maxInnerHeight
    if (image) {
        const aspect = image.width / image.height
        drawWidth = maxInnerWidth
        drawHeight = drawWidth / aspect
        if (drawHeight > maxInnerHeight) {
        drawHeight = maxInnerHeight
        drawWidth = drawHeight * aspect
        }
    }

    const boxWidth = drawWidth + CARD_BOX_PADDING_MM * 2
    const boxX = columnX + (columnWidth - boxWidth) / 2
    const innerX = boxX + CARD_BOX_PADDING_MM
    const drawX = innerX
    const drawY = contentTop + (maxInnerHeight - drawHeight) / 2

    doc.setFillColor(...ctx.theme.subHeadingBg)
    doc.roundedRect(boxX, boxTop, boxWidth, sectionHeight, ctx.theme.borderRadiusSmallMm, ctx.theme.borderRadiusSmallMm, 'F')

    if (image && card) {
        const isReversed = reading.reversals === true && reading.reversalValues[idx] === true
        const el = isReversed ? image.reversedElement : image.element
        // Same border radius as the box itself, so the image's corners
        // match the card section border they sit inside instead of showing
        // square corners poking past a rounded frame.
        drawRoundedImage(doc, el, drawX, drawY, drawWidth, drawHeight, ctx.theme.borderRadiusSmallMm)
    } else {
        doc.setDrawColor(...COLOR_GRAY)
        doc.setLineWidth(0.3)
        doc.roundedRect(drawX, drawY, drawWidth, drawHeight, ctx.theme.borderRadiusSmallMm, ctx.theme.borderRadiusSmallMm)
    }

    if (card) {
        const centerX = boxX + boxWidth / 2
        drawCardLabel(doc, card.name, centerX, boxTop + CARD_BOX_PADDING_MM, labelBandHeight, ctx.theme.subHeadingText)
        if (spread) {
        drawCardLabel(doc, spread.pulls[idx], centerX, boxTop + sectionHeight - CARD_BOX_PADDING_MM - labelBandHeight, labelBandHeight, ctx.theme.subHeadingText)
        }
    }
    })

  ctx.y = boxTop + sectionHeight + SECTION_GAP_MM
}
