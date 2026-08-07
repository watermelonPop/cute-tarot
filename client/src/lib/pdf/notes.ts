import type { JsPdfInstance } from './jspdf'
import type { Ctx } from './context'
import type { SideImage } from './images'
import { sanitizeText, wrapPlainText, excerpt } from './textUtils'
import { hexToRgb } from './theme'
import { writeSubHeadingPill, writeReversedReminder } from './headings'
import { writeAnnotatedParagraph } from './paragraph'
import type { Annotation } from '../../types'
import {
  FONT_BODY_PT,
  HIGHLIGHT_RECT_TOP_OFFSET_MM,
  NOTE_BOX_PADDING_MM,
  NOTE_CARD_GAP_MM,
  NOTE_CARD_BORDER_RADIUS_MM,
  NOTE_QUOTE_BAR_WIDTH_MM,
  NOTE_QUOTE_BAR_GAP_MM,
  NOTE_QUOTE_GAP_MM,
  NOTE_QUOTE_COLOR,
  NOTE_DEFAULT_BAR_COLOR,
  NOTES_COLUMN_WIDTH_MM,
  NOTES_COLUMN_GAP_MM,
  COLOR_BLACK,
} from './constants'

// --- Note blocks -------------------------------------------------------------

function measureNoteBlock(doc: JsPdfInstance, annotation: Annotation, width: number): { quoteLines: string[]; noteLines: string[]; height: number; quoteIndent: number } {
  const quoteIndent = NOTE_QUOTE_BAR_WIDTH_MM + NOTE_QUOTE_BAR_GAP_MM
  const innerWidth = width - NOTE_BOX_PADDING_MM * 2

  doc.setFont('times', 'italic')
  doc.setFontSize(FONT_BODY_PT - 1)
  const quoteLines = wrapPlainText(doc, `"${excerpt(sanitizeText(annotation.text))}"`, innerWidth - quoteIndent)

  doc.setFont('times', 'normal')
  doc.setFontSize(FONT_BODY_PT - 1)
  const noteLines = wrapPlainText(doc, annotation.note ?? '', innerWidth)

  const lineH = 4.6
  const height =
    NOTE_BOX_PADDING_MM +
    quoteLines.length * lineH +
    NOTE_QUOTE_GAP_MM +
    noteLines.length * lineH +
    NOTE_BOX_PADDING_MM

  return { quoteLines, noteLines, height, quoteIndent }
}

function drawNoteBlockAt(
  doc: JsPdfInstance,
  x: number,
  y: number,
  width: number,
  quoteLines: string[],
  noteLines: string[],
  height: number,
  quoteIndent: number,
  highlightColor?: string
): void {
  const lineH = 4.6
  const quoteTop = y + NOTE_BOX_PADDING_MM
  const quoteBlockHeight = quoteLines.length * lineH
  const barColor = highlightColor ? hexToRgb(highlightColor) : NOTE_DEFAULT_BAR_COLOR


  // Card border, rounded to match .noteCard's border-radius.
  doc.setDrawColor(...barColor)
  doc.setLineWidth(0.5)
  doc.roundedRect(x, y, width, height, NOTE_CARD_BORDER_RADIUS_MM, NOTE_CARD_BORDER_RADIUS_MM, 'S')

  // Left accent bar, matching .noteCardQuote's border-left.
  doc.setFillColor(...barColor)
  doc.rect(x + NOTE_BOX_PADDING_MM, quoteTop, NOTE_QUOTE_BAR_WIDTH_MM, quoteBlockHeight, 'F')

  doc.setFont('times', 'italic')
  doc.setFontSize(FONT_BODY_PT - 1)
  doc.setTextColor(...NOTE_QUOTE_COLOR)
  let lineY = quoteTop + lineH * 0.8
  for (const line of quoteLines) {
    doc.text(line, x + NOTE_BOX_PADDING_MM + quoteIndent, lineY)
    lineY += lineH
  }

  const noteTop = quoteTop + quoteBlockHeight + NOTE_QUOTE_GAP_MM
  doc.setFont('times', 'normal')
  doc.setTextColor(...COLOR_BLACK)
  lineY = noteTop + lineH * 0.8
  for (const line of noteLines) {
    doc.text(line, x + NOTE_BOX_PADDING_MM, lineY)
    lineY += lineH
  }
}

/**
 * Lays out note cards in the side column, grouped by the page their anchor
 * landed on and stacked top-down within each page — mirrors NotesPanel.tsx's
 * recomputePositions: a card's top is at least its anchor's y, but pushed
 * further down if the previous card in the column hasn't finished yet.
 * Returns the furthest-down point any card reached on ctx's own current
 * page, so the caller can push ctx.y past it and avoid the next section
 * overlapping a tall note stack (the jsPDF equivalent of the minHeight
 * reservation used in AnnotatedSection.tsx).
 *
 * Known limitation: doesn't push a card that would overflow the bottom
 * margin onto a new page — acceptable for typical note lengths, but a very
 * tall stack near a page bottom could run off it.
 */
function layoutAndDrawNotesColumn(
  doc: JsPdfInstance,
  ctx: Ctx,
  noteAnnotations: Annotation[],
  anchors: Map<string, { page: number; y: number }>,
  columnX: number,
  columnWidth: number
): number {
  if (noteAnnotations.length === 0) return 0

  const sorted = [...noteAnnotations].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const measured = sorted
    .map(a => ({ annotation: a, anchor: anchors.get(a.id), ...measureNoteBlock(doc, a, columnWidth) }))
    .filter((m): m is typeof m & { anchor: { page: number; y: number } } => m.anchor !== undefined)

  const byPage = new Map<number, typeof measured>()
  for (const m of measured) {
    const list = byPage.get(m.anchor.page) ?? []
    list.push(m)
    byPage.set(m.anchor.page, list)
  }

  const originalPage = ctx.currentPage
  let maxBottomOnCurrentPage = 0

  for (const [page, list] of byPage) {
    list.sort((a, b) => a.anchor.y - b.anchor.y)
    doc.setPage(page)

    let cursor = -Infinity
    for (const item of list) {
      const top = Math.max(item.anchor.y - HIGHLIGHT_RECT_TOP_OFFSET_MM, cursor)
      drawNoteBlockAt(doc, columnX, top, columnWidth, item.quoteLines, item.noteLines, item.height, item.quoteIndent, item.annotation.highlightColor)
      const bottom = top + item.height
      cursor = bottom + NOTE_CARD_GAP_MM
      if (page === originalPage) maxBottomOnCurrentPage = Math.max(maxBottomOnCurrentPage, bottom)
    }
  }

  doc.setPage(originalPage)
  return maxBottomOnCurrentPage
}

export function writeAnnotatedSection(
  doc: JsPdfInstance,
  ctx: Ctx,
  headingId: string,
  heading: string,
  targetId: string,
  text: string,
  annotations: Annotation[],
  beforeBody?: string,
  sideImage?: SideImage
): void {
  if (headingId) ctx.onHeadingRendered?.(headingId)

  writeSubHeadingPill(doc, ctx, heading)

  if (beforeBody) {
    writeReversedReminder(doc, ctx, beforeBody)
  }

  const sectionAnnotations = annotations.filter(a => a.targetId === targetId)
  const noteAnnotations = sectionAnnotations.filter(a => !!a.note)
  const hasNotes = noteAnnotations.length > 0

  const paragraphWidth = hasNotes ? ctx.contentWidth - NOTES_COLUMN_WIDTH_MM - NOTES_COLUMN_GAP_MM : ctx.contentWidth
  const anchors = hasNotes ? new Map<string, { page: number; y: number }>() : undefined

  writeAnnotatedParagraph(doc, ctx, text, annotations, targetId, paragraphWidth, anchors, sideImage)

  if (hasNotes && anchors) {
    const columnX = ctx.x + paragraphWidth + NOTES_COLUMN_GAP_MM
    const notesBottom = layoutAndDrawNotesColumn(doc, ctx, noteAnnotations, anchors, columnX, NOTES_COLUMN_WIDTH_MM)
    if (notesBottom > ctx.y) ctx.y = notesBottom
  }
}
