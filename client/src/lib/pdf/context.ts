import type { JsPdfInstance } from './jspdf'
import type { Theme } from './theme'
import { MARGIN } from './constants'

// --- Small geometry/state helpers -------------------------------------------

export interface Ctx {
  x: number
  y: number
  pageWidth: number
  pageHeight: number
  contentWidth: number
  theme: Theme
  currentPage: number
  onHeadingRendered?: (id: string) => void
}

export function makeCtx(doc: JsPdfInstance, theme: Theme, onHeadingRendered?: (id: string) => void): Ctx {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  return {
    x: MARGIN,
    y: MARGIN,
    pageWidth,
    pageHeight,
    contentWidth: pageWidth - MARGIN * 2,
    theme,
    currentPage: doc.internal.getNumberOfPages(),
    onHeadingRendered,
  }
}

export function ensureSpace(doc: JsPdfInstance, ctx: Ctx, neededMm: number): void {
  if (ctx.y + neededMm > ctx.pageHeight - MARGIN) {
    doc.addPage()
    ctx.y = MARGIN
    ctx.currentPage = doc.internal.getNumberOfPages()
  }
}
