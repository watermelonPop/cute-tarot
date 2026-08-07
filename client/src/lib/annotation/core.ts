import type { Annotation, AnnotationSegment, HideMode } from '../../types'
import { DEFAULT_HIGHLIGHT_COLOR, resolveHighlightColor } from './colors'

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export function createAnnotation(params: {
  targetId: string
  startOffset: number
  endOffset: number
  text: string
  hideMode?: HideMode
  highlightColor?: string
  note?: string
}): Annotation {
  // A note always implies a highlight — if the caller attached a note
  // without picking a color, fall back to the default rather than letting
  // the two fields drift out of sync.
  const highlightColor = params.note && !params.highlightColor
    ? DEFAULT_HIGHLIGHT_COLOR
    : params.highlightColor

  return {
    id: crypto.randomUUID(),
    targetId: params.targetId,
    startOffset: params.startOffset,
    endOffset: params.endOffset,
    text: params.text,
    hideMode: params.hideMode ?? 'none',
    highlightColor,
    note: params.note,
    createdAt: new Date().toISOString(),
  }
}

export function isAnnotationEmpty(a: Pick<Annotation, 'hideMode' | 'highlightColor' | 'note'>): boolean {
  return a.hideMode === 'none' && !a.highlightColor && !a.note
}

/** Finds an annotation covering the exact same range — not a partial overlap. */
export function findAnnotationAtSelection(
  annotations: Annotation[],
  targetId: string,
  startOffset: number,
  endOffset: number
): Annotation | undefined {
  return annotations.find(
    a => a.targetId === targetId && a.startOffset === startOffset && a.endOffset === endOffset
  )
}

export function sliceAnnotationRange(a: Annotation, newStart: number, newEnd: number): Annotation {
  return {
    ...a,
    startOffset: newStart,
    endOffset: newEnd,
    text: a.text.slice(newStart - a.startOffset, newEnd - a.startOffset),
  }
}

export function applyHideModeSideEffects(piece: Annotation, mode: HideMode): Annotation {
  if (mode !== 'hidden' || piece.note) return piece
  return { ...piece, highlightColor: undefined }
}

/**
 * Converts an Annotation's optional fields (highlightColor, note) from
 * `undefined` to `null` before sending over the wire. JSON.stringify drops
 * `undefined` keys entirely, and Prisma treats a missing key in `data` as
 * "don't touch this column" rather than "clear it" — so clearing a
 * previously-set value requires an explicit `null`, not `undefined`.
 */
export function serializeAnnotationForApi(annotation: Annotation) {
  return {
    ...annotation,
    highlightColor: annotation.highlightColor ?? null,
    note: annotation.note ?? null,
  }
}

/**
 * Checks whether any part of [startOffset, endOffset) overlaps an existing
 * 'hidden' annotation on the same target — not just an exact range match.
 * Used to disable highlight/strikethrough when a new selection partially
 * covers already-hidden text, since editing styling on text the reader
 * can't currently see is confusing and the underlying offsets would get
 * messy to reason about once hidden and visible ranges interleave.
 */
export function selectionOverlapsHiddenAnnotation(
  annotations: Annotation[],
  targetId: string,
  startOffset: number,
  endOffset: number
): boolean {
  return annotations.some(
    a =>
      a.targetId === targetId &&
      a.hideMode === 'hidden' &&
      a.startOffset < endOffset &&
      startOffset < a.endOffset
  )
}

/**
 * Checks whether every point in [startOffset, endOffset) is covered by some
 * annotation with the given hideMode — i.e. whether the whole range is
 * uniformly in that state, regardless of how many annotations make it up.
 * Used to decide toggle direction and toolbar active-state.
 */
export function isRangeFullyHideMode(
  annotations: Annotation[],
  targetId: string,
  startOffset: number,
  endOffset: number,
  mode: HideMode
): boolean {
  if (startOffset >= endOffset) return false

  const relevant = annotations.filter(
    a => a.targetId === targetId && a.startOffset < endOffset && a.endOffset > startOffset
  )

  const points = new Set<number>([startOffset, endOffset])
  relevant.forEach(a => {
    if (a.startOffset > startOffset && a.startOffset < endOffset) points.add(a.startOffset)
    if (a.endOffset > startOffset && a.endOffset < endOffset) points.add(a.endOffset)
  })
  const boundaries = Array.from(points).sort((x, y) => x - y)

  for (let i = 0; i < boundaries.length - 1; i++) {
    const segStart = boundaries[i]
    const segEnd = boundaries[i + 1]
    if (segStart >= segEnd) continue
    const covered = relevant.some(a => a.startOffset <= segStart && a.endOffset >= segEnd && a.hideMode === mode)
    if (!covered) return false
  }

  return true
}

// ---------------------------------------------------------------------------
// Segment merging (the core render-prep step)
// ---------------------------------------------------------------------------

/**
 * Splits a source string into non-overlapping segments given a (possibly
 * overlapping) set of annotations targeting it, resolving the composed
 * hide/strikethrough/highlight/notes state for each segment.
 *
 * Rules applied:
 * - `hideMode: 'hidden'` on ANY active annotation makes the whole segment
 *   completely hidden, regardless of other overlapping annotations.
 * - `hideMode: 'strikethrough'` composes with highlight color (struck-through
 *   text on a colored background) rather than being overridden by it.
 * - Overlapping highlight colors are resolved via resolveHighlightColor.
 * - Notes are collected (not resolved to one) — a segment covered by
 *   multiple note-bearing annotations returns all of their notes.
 * - `createdAt` provides a stable ordering of the active annotations per
 *   segment, for callers that want deterministic stacking (e.g. z-index).
 */
export function buildAnnotationSegments(
  sourceText: string,
  annotations: Annotation[]
): AnnotationSegment[] {
  const relevant = annotations.filter(
    a => a.startOffset < a.endOffset && a.startOffset >= 0 && a.endOffset <= sourceText.length
  )

  if (relevant.length === 0) {
    return [{
      text: sourceText,
      startOffset: 0,
      endOffset: sourceText.length,
      annotationIds: [],
      completelyHidden: false,
      struckThrough: false,
      notes: [],
    }]
  }

  const points = new Set<number>([0, sourceText.length])
  relevant.forEach(a => {
    points.add(a.startOffset)
    points.add(a.endOffset)
  })
  const boundaries = Array.from(points).sort((a, b) => a - b)

  const segments: AnnotationSegment[] = []

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i]
    const end = boundaries[i + 1]
    if (start >= end) continue

    const active = relevant
      .filter(a => a.startOffset <= start && a.endOffset >= end)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    if (active.length === 0) {
      segments.push({
        text: sourceText.slice(start, end),
        startOffset: start,
        endOffset: end,
        annotationIds: [],
        completelyHidden: false,
        struckThrough: false,
        notes: [],
      })
      continue
    }

    const completelyHidden = active.some(a => a.hideMode === 'hidden')
    const struckThrough = active.some(a => a.hideMode === 'strikethrough')
    const colors = active.filter(a => a.highlightColor).map(a => a.highlightColor as string)
    const notes = active.filter(a => a.note).map(a => a.note as string)

    segments.push({
      text: sourceText.slice(start, end),
      startOffset: start,
      endOffset: end,
      annotationIds: active.map(a => a.id),
      completelyHidden,
      struckThrough,
      highlightColor: resolveHighlightColor(colors),
      notes,
    })
  }

  return segments
}