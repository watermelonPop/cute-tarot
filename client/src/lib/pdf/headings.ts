import type { JsPdfInstance } from './jspdf'
import type { Ctx } from './context'
import { ensureSpace } from './context'
import { sanitizeText, wrapPlainText } from './textUtils'
import { remToMm } from './units'
import { FONT_BODY_PT, FONT_HEADING_PT, CARD_LABEL_FONT_PT } from './constants'

// --- Heading -----------------------------------------------------------------

/**
 * Draws a heading matching .sectionHeading's live look: a horizontal rule
 * above it (secondary-background color), centered uppercase letter-spaced
 * text (accent-background color, per the CSS's slightly unusual choice of
 * using the *background* variable as the heading's text color).
 *
 * `isFirst` skips the rule/top-padding, mirroring
 * `.cardDescription > .sectionHeading:first-of-type { border-top: none; }`
 * — true only for the very first heading on the page.
 */
export function writeHeading(doc: JsPdfInstance, ctx: Ctx, text: string, level: 1 | 2 | 3, id?: string, isFirst = false): void {
  const sizePt = FONT_HEADING_PT[level]
  const headingLineHeight = sizePt * 0.3528 * 1.4
  const topPaddingMm = remToMm(1)
  const ruleGapMm = isFirst ? 0 : remToMm(1) * 0.4

  ensureSpace(doc, ctx, headingLineHeight + topPaddingMm + ruleGapMm)
  if (id) ctx.onHeadingRendered?.(id)

  if (!isFirst) {
    ctx.y += ruleGapMm
    doc.setDrawColor(...ctx.theme.sectionHeadingBorderColor)
    doc.setLineWidth(0.5)
    doc.line(ctx.x, ctx.y, ctx.x + ctx.contentWidth, ctx.y)
  }

  ctx.y += topPaddingMm

  doc.setFont('times', 'bold')
  doc.setFontSize(sizePt)
  doc.setTextColor(...ctx.theme.sectionHeadingColor)
  ctx.y += headingLineHeight
  const safeText = sanitizeText(text)
  const textWidth = doc.getTextWidth(safeText)
  doc.text(safeText, ctx.x + ctx.contentWidth / 2 - textWidth / 2, ctx.y)

  ctx.y += topPaddingMm * 0.6
}

/** Draws a filled, rounded pill matching .subHeading's live look: accent-background fill, centered bold accent-text label. */
export function writeSubHeadingPill(doc: JsPdfInstance, ctx: Ctx, text: string, id?: string): void {
  const sizePt = FONT_BODY_PT
  const paddingMm = remToMm(0.5)
  const marginMm = remToMm(0.5)
  const lineHeightMm = sizePt * 0.3528 * 1.3
  const pillHeight = paddingMm * 2 + lineHeightMm

  ensureSpace(doc, ctx, marginMm + pillHeight + marginMm)
  if (id) ctx.onHeadingRendered?.(id)
  ctx.y += marginMm

  doc.setFillColor(...ctx.theme.subHeadingBg)
  doc.roundedRect(ctx.x, ctx.y, ctx.contentWidth, pillHeight, ctx.theme.borderRadiusSmallMm, ctx.theme.borderRadiusSmallMm, 'F')

  doc.setFont('times', 'bold')
  doc.setFontSize(sizePt)
  doc.setTextColor(...ctx.theme.subHeadingText)
  const textY = ctx.y + paddingMm + lineHeightMm * 0.75
  const safeText = sanitizeText(text)
  const textWidth = doc.getTextWidth(safeText)
  doc.text(safeText, ctx.x + ctx.contentWidth / 2 - textWidth / 2, textY)

  ctx.y += pillHeight + marginMm
}

export function writeReversedReminder(doc: JsPdfInstance, ctx: Ctx, text: string): void {
  const sizePt = FONT_BODY_PT - 1
  const paddingMm = remToMm(0.5)
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(sizePt)

  const maxTextWidth = ctx.contentWidth - paddingMm * 2
  const lines = wrapPlainText(doc, text, maxTextWidth)
  const lineH = sizePt * 0.3528 * 1.3
  const boxWidth = Math.min(ctx.contentWidth, Math.max(...lines.map(l => doc.getTextWidth(l))) + paddingMm * 2)
  const boxHeight = paddingMm * 2 + lines.length * lineH

  ensureSpace(doc, ctx, boxHeight + 3)
  ctx.y += 3

  const boxX = ctx.x + (ctx.contentWidth - boxWidth) / 2

  doc.setFillColor(...ctx.theme.reversedReminderBg)
  doc.roundedRect(boxX, ctx.y, boxWidth, boxHeight, ctx.theme.borderRadiusSmallMm, ctx.theme.borderRadiusSmallMm, 'F')

  doc.setTextColor(...ctx.theme.reversedReminderText)
  let lineY = ctx.y + paddingMm + lineH * 0.75
  for (const line of lines) {
    const lineWidth = doc.getTextWidth(line)
    doc.text(line, boxX + boxWidth / 2 - lineWidth / 2, lineY)
    lineY += lineH
  }

  ctx.y += boxHeight + 3
}

/** Draws `text` centered within a horizontal band, vertically centered on that band's own height. */
export function drawCardLabel(doc: JsPdfInstance, text: string, centerX: number, bandTop: number, bandHeight: number, color: [number, number, number]): void {
  doc.setFont('times', 'bold')
  doc.setFontSize(CARD_LABEL_FONT_PT)
  doc.setTextColor(...color)

  const lineH = CARD_LABEL_FONT_PT * 0.3528 * 1.3
  const textY = bandTop + bandHeight / 2 + lineH * 0.32 // baseline sits slightly below center
  const safeText = sanitizeText(text)
  const textWidth = doc.getTextWidth(safeText)
  doc.text(safeText, centerX - textWidth / 2, textY)
}
