import type { JsPdfInstance } from './jspdf'
import type { Ctx } from './context'
import { ensureSpace } from './context'
import type { SideImage } from './images'
import { sanitizeText } from './textUtils'
import { buildAnnotationSegments } from '../annotation/core'
import type { Annotation } from '../../types'
import {
  FONT_BODY_PT,
  LINE_HEIGHT_MM,
  PARAGRAPH_GAP_MM,
  HIGHLIGHT_RECT_TOP_OFFSET_MM,
  HIGHLIGHT_RECT_HEIGHT_MM,
  COLOR_BLACK,
  DESC_IMAGE_TEXT_GAP_MM,
  REVEAL_HIDDEN_IN_EXPORT,
} from './constants'
import { hexToRgb } from './theme'

// --- Annotated paragraph (highlight / strikethrough / hidden aware) --------

interface LineFragment {
  text: string
  x: number
  width: number
  highlightColor?: string
  struckThrough?: boolean
}

function flushLine(doc: JsPdfInstance, ctx: Ctx, fragments: LineFragment[]): void {
  if (fragments.length === 0) return

  // Pass 1: highlight backgrounds, behind the text.
  for (const f of fragments) {
    if (!f.highlightColor) continue
    doc.setFillColor(...hexToRgb(f.highlightColor))
    doc.rect(f.x, ctx.y - HIGHLIGHT_RECT_TOP_OFFSET_MM, f.width, HIGHLIGHT_RECT_HEIGHT_MM, 'F')
  }

  // Pass 2: the text itself, on top of any highlight fill.
  doc.setFont('times', 'normal')
  doc.setFontSize(FONT_BODY_PT)
  doc.setTextColor(...COLOR_BLACK)
  for (const f of fragments) {
    doc.text(f.text, f.x, ctx.y)
  }

  // Pass 3: strikethrough lines.
  doc.setDrawColor(...COLOR_BLACK)
  doc.setLineWidth(0.3)
  for (const f of fragments) {
    if (!f.struckThrough) continue
    const strikeY = ctx.y - 1.6
    doc.line(f.x, strikeY, f.x + f.width, strikeY)
  }
}

/**
 * Renders `text` word-by-word, honoring per-character annotation state
 * (highlight color, strikethrough, hidden) from buildAnnotationSegments —
 * the same segmentation logic AnnotatedText.tsx uses on-screen, so exported
 * annotation boundaries always match what the user actually created.
 *
 * Every line — including the first — advances ctx.y via startLine() BEFORE
 * anything is drawn on it. The previous version only advanced ctx.y inside
 * the overflow branch, which meant the first line of every paragraph never
 * got a line-height added before drawing and landed almost directly on top
 * of whatever the heading above it had just drawn.
 */
export function writeAnnotatedParagraph(
  doc: JsPdfInstance,
  ctx: Ctx,
  text: string,
  annotations: Annotation[],
  targetId: string,
  columnWidth: number,
  noteAnchors?: Map<string, { page: number; y: number }>,
  sideImage?: SideImage
): void {
  const relevant = annotations.filter(a => a.targetId === targetId)
  const segments = buildAnnotationSegments(text, relevant)
  const noteAnnotationIds = new Set(relevant.filter(a => !!a.note).map(a => a.id))

  doc.setFont('times', 'normal')
  doc.setFontSize(FONT_BODY_PT)

  let pending: LineFragment[] = []
  let cursorX = ctx.x
  let lineStarted = false
  let lineIndent = 0

  // Draw the image once, at the top-left of the paragraph, before any text
  // lines are laid out — its bottom edge is what each line below checks
  // itself against to decide whether it still needs to indent around it.
    let imageBottomY: number | null = null
    let imagePage: number | null = null
    if (sideImage) {
        ensureSpace(doc, ctx, sideImage.heightMm)
        const imageY = ctx.y + 2
        doc.addImage(sideImage.dataUrl, 'PNG', ctx.x, imageY, sideImage.widthMm, sideImage.heightMm)
        imageBottomY = imageY + sideImage.heightMm
        imagePage = ctx.currentPage
    }

    const startLine = () => {
        ctx.y += LINE_HEIGHT_MM
        ensureSpace(doc, ctx, LINE_HEIGHT_MM)
        const wrapsAroundImage =
            imageBottomY !== null &&
            ctx.currentPage === imagePage &&
            ctx.y < imageBottomY + LINE_HEIGHT_MM
        lineIndent = wrapsAroundImage && sideImage ? sideImage.widthMm + DESC_IMAGE_TEXT_GAP_MM : 0
        cursorX = ctx.x + lineIndent
        lineStarted = true
    }

  const endLine = () => {
    flushLine(doc, ctx, pending)
    pending = []
  }

  for (const segment of segments) {
    if (segment.completelyHidden && !REVEAL_HIDDEN_IN_EXPORT) continue

    const words = sanitizeText(segment.text).split(/(\s+)/).filter(w => w.length > 0)
    for (const word of words) {
      const isWhitespace = /^\s+$/.test(word)
      const width = doc.getTextWidth(word)

      if (!lineStarted) startLine()
      if (isWhitespace && pending.length === 0) continue

      if (cursorX + width > ctx.x + columnWidth && pending.length > 0) {
        endLine()
        startLine()
      }

      if (noteAnchors) {
        for (const id of segment.annotationIds) {
          if (noteAnnotationIds.has(id) && !noteAnchors.has(id)) {
            noteAnchors.set(id, { page: ctx.currentPage, y: ctx.y })
          }
        }
      }

      pending.push({
        text: word,
        x: cursorX,
        width,
        highlightColor: segment.highlightColor,
        struckThrough: segment.struckThrough,
      })
      cursorX += width
    }
  }

  if (pending.length > 0) endLine()

  ctx.y += PARAGRAPH_GAP_MM
}
