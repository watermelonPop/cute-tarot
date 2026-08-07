import type { Annotation, HideMode } from '../../types'
import { DEFAULT_HIGHLIGHT_COLOR } from './colors'
import {
  applyHideModeSideEffects,
  createAnnotation,
  isAnnotationEmpty,
  isRangeFullyHideMode,
  sliceAnnotationRange,
} from './core'

export type AnnotationMutation =
  | { action: 'create'; annotation: Annotation }
  | { action: 'update'; annotation: Annotation }
  | { action: 'delete'; annotationId: string }
  | { action: 'noop' }

export interface AnnotationBatch {
  creates: Annotation[]
  updates: Annotation[]
  deletes: string[]
}

type Selection = { targetId: string; startOffset: number; endOffset: number; text: string }

/**
 * Toggles a highlight color for the annotation at an exact selection range.
 *
 * If the annotation already carries a note, a highlight must remain (a note
 * implies a highlight — see createAnnotation), so clicking the currently
 * active color is a no-op rather than removing the color.
 */
export function toggleHighlight(
  existing: Annotation | undefined,
  color: string,
  selection: Selection,
  options?: { toggleOffOnAnyColor?: boolean }
): AnnotationMutation {
  if (!existing) {
    return {
      action: 'create',
      annotation: createAnnotation({ ...selection, highlightColor: color }),
    }
  }

  const shouldRemove = options?.toggleOffOnAnyColor
    ? !!existing.highlightColor
    : existing.highlightColor === color

  if (shouldRemove && existing.note) {
    return { action: 'noop' }
  }

  const nextColor = shouldRemove ? undefined : color
  const updated: Annotation = { ...existing, highlightColor: nextColor }

  return isAnnotationEmpty(updated)
    ? { action: 'delete', annotationId: existing.id }
    : { action: 'update', annotation: updated }
}

/**
 * Sets (or clears) the note for the annotation at an exact selection range.
 *
 * An empty/whitespace-only note is treated as "remove the note" — if that
 * leaves the annotation with no hideMode, no highlight, and no note, it's
 * flagged for deletion rather than left as an empty stub. A non-empty note
 * always implies a highlight (matching createAnnotation's invariant), so
 * saving a note on an annotation with no highlightColor yet falls back to
 * the default color rather than leaving it note-only and invisible.
 */
export function setNoteForSelection(
  existing: Annotation | undefined,
  noteText: string,
  selection: Selection
): AnnotationMutation {
  const trimmed = noteText.trim()

  if (!trimmed) {
    if (!existing) return { action: 'noop' }
    const updated: Annotation = { ...existing, note: undefined }
    return isAnnotationEmpty(updated)
      ? { action: 'delete', annotationId: existing.id }
      : { action: 'update', annotation: updated }
  }

  if (!existing) {
    return {
      action: 'create',
      annotation: createAnnotation({ ...selection, note: trimmed }),
    }
  }

  const updated: Annotation = {
    ...existing,
    note: trimmed,
    highlightColor: existing.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR,
  }
  return { action: 'update', annotation: updated }
}

/**
 * Sets hideMode to exactly `mode` across [startOffset, endOffset), splitting
 * any overlapping annotations as needed. Flanking portions outside the
 * range keep their original hideMode/highlightColor/note untouched; the
 * portion inside the range takes on the new hideMode while keeping its own
 * highlightColor/note (subject to hidden's clearing side effect). Any part
 * of the range not covered by an existing annotation gets a fresh one.
 *
 * highlightColor and note are NOT split/merged this way elsewhere — their
 * overlap (blending, stacking) is intentional. This function only ever
 * touches the hideMode field.
 */
export function setHideModeForRange(
  annotations: Annotation[],
  targetId: string,
  startOffset: number,
  endOffset: number,
  mode: HideMode,
  fallbackText: string
): AnnotationBatch {
  const batch: AnnotationBatch = { creates: [], updates: [], deletes: [] }
  if (startOffset >= endOffset) return batch

  const overlapping = annotations.filter(
    a => a.targetId === targetId && a.startOffset < endOffset && a.endOffset > startOffset && a.hideMode !== 'none'
  )

  const coveredRanges: Array<[number, number]> = []

  for (const a of overlapping) {
    const overlapStart = Math.max(a.startOffset, startOffset)
    const overlapEnd = Math.min(a.endOffset, endOffset)
    coveredRanges.push([overlapStart, overlapEnd])

    const hasBefore = a.startOffset < overlapStart
    const hasAfter = a.endOffset > overlapEnd

    // Flanks outside the target range are untouched — same hideMode,
    // same highlightColor/note, just clipped to their new bounds.
    if (hasBefore) {
      batch.updates.push(sliceAnnotationRange(a, a.startOffset, overlapStart))
    }
    if (hasAfter) {
      const afterPiece = { ...sliceAnnotationRange(a, overlapEnd, a.endOffset), id: crypto.randomUUID() }
      batch.creates.push(afterPiece)
    }

    // The inside piece takes on the new hideMode, keeping this
    // annotation's own highlightColor/note (subject to hidden's side effect).
    const insidePiece = applyHideModeSideEffects(
      { ...sliceAnnotationRange(a, overlapStart, overlapEnd), hideMode: mode },
      mode
    )

    const fullyConsumed = !hasBefore && !hasAfter

    if (isAnnotationEmpty(insidePiece)) {
      // Nothing left to represent for this piece. If the whole original
      // annotation was consumed, it's gone; otherwise there's simply no
      // annotation needed for the inside slice (the flanks above already
      // cover what remains).
      if (fullyConsumed) batch.deletes.push(a.id)
    } else if (fullyConsumed) {
      // No flanks were split off — reuse the original id as an update
      // rather than deleting and recreating it.
      batch.updates.push({ ...insidePiece, id: a.id })
    } else {
      batch.creates.push({ ...insidePiece, id: crypto.randomUUID() })
    }
  }

  // Fill any part of the range not covered by an existing annotation.
  // Only relevant when turning something on — clearing to 'none' never
  // needs new annotations for previously-uncovered text.
  if (mode !== 'none') {
    coveredRanges.sort((x, y) => x[0] - y[0])
    let cursor = startOffset
    for (const [s, e] of coveredRanges) {
      if (s > cursor) {
        batch.creates.push(createAnnotation({
          targetId,
          startOffset: cursor,
          endOffset: s,
          text: fallbackText.slice(cursor - startOffset, s - startOffset),
          hideMode: mode,
        }))
      }
      cursor = Math.max(cursor, e)
    }
    if (cursor < endOffset) {
      batch.creates.push(createAnnotation({
        targetId,
        startOffset: cursor,
        endOffset,
        text: fallbackText.slice(cursor - startOffset, endOffset - startOffset),
        hideMode: mode,
      }))
    }
  }

  return batch
}

/**
 * Toggles hideMode across a selection range, splitting overlapping
 * annotations as needed (see setHideModeForRange). If the entire range is
 * already uniformly `mode`, turns it off (back to 'none'); otherwise sets
 * the whole range to `mode`.
 */
export function toggleHideModeForRange(
  annotations: Annotation[],
  mode: Exclude<HideMode, 'none'>,
  selection: Selection
): AnnotationBatch {
  const isFullyActive = isRangeFullyHideMode(
    annotations, selection.targetId, selection.startOffset, selection.endOffset, mode
  )
  const nextMode: HideMode = isFullyActive ? 'none' : mode

  return setHideModeForRange(
    annotations, selection.targetId, selection.startOffset, selection.endOffset, nextMode, selection.text
  )
}

/** Applies a batch in-memory, producing the resulting annotations array. */
function applyBatchLocally(annotations: Annotation[], batch: AnnotationBatch): Annotation[] {
  const deleted = new Set(batch.deletes)
  const updatedById = new Map(batch.updates.map(a => [a.id, a]))
  const kept = annotations.filter(a => !deleted.has(a.id)).map(a => updatedById.get(a.id) ?? a)
  return [...kept, ...batch.creates]
}

/**
 * Scans a target's annotations for touching strikethrough runs that share
 * identical highlightColor/note, and collapses each run into one
 * annotation. Only merges when EVERY field but range is identical —
 * merging across differing highlightColor/note would silently discard one
 * side's value, which is never safe. Never touches 'hidden' or plain
 * highlight-only annotations; scoped strictly to strikethrough.
 */
function mergeAdjacentStrikethrough(annotations: Annotation[], targetId: string): AnnotationBatch {
  const batch: AnnotationBatch = { creates: [], updates: [], deletes: [] }

  const relevant = annotations
    .filter(a => a.targetId === targetId)
    .sort((a, b) => a.startOffset - b.startOffset)

  let i = 0
  while (i < relevant.length) {
    let run = relevant[i]
    let changed = false
    let j = i + 1

    while (
        j < relevant.length &&
        relevant[j].startOffset === run.endOffset &&
        run.hideMode === 'strikethrough' &&
        relevant[j].hideMode === 'strikethrough' &&
        (relevant[j].highlightColor ?? null) === (run.highlightColor ?? null) &&
        (relevant[j].note ?? null) === (run.note ?? null)
    ) {
      run = { ...run, endOffset: relevant[j].endOffset, text: run.text + relevant[j].text }
      batch.deletes.push(relevant[j].id)
      changed = true
      j++
    }

    if (changed) batch.updates.push(run) // run.id is unchanged throughout — still relevant[i].id
    i = j
  }

  return batch
}

/**
 * Reconciles a split batch with a subsequent merge batch computed against
 * its simulated result. Critically, this ensures a piece created by the
 * split step is never both created AND deleted by the merge step — if a
 * split-produced fragment gets immediately absorbed into a neighbor, it's
 * simply dropped from the final batch rather than round-tripped through
 * the API. Deletes are also filtered to exclude any id that was never
 * actually persisted (i.e. one of the split step's own creates).
 */
function combineBatches(splitBatch: AnnotationBatch, mergeBatch: AnnotationBatch): AnnotationBatch {
  const deleteSet = new Set([...splitBatch.deletes, ...mergeBatch.deletes])

  const updateMap = new Map(splitBatch.updates.map(a => [a.id, a]))
  for (const u of mergeBatch.updates) updateMap.set(u.id, u)
  for (const id of deleteSet) updateMap.delete(id)

  const createdIds = new Set(splitBatch.creates.map(c => c.id))
  const finalCreates = splitBatch.creates.filter(c => !deleteSet.has(c.id))
  const finalDeletes = [...deleteSet].filter(id => !createdIds.has(id))

  return { creates: finalCreates, updates: [...updateMap.values()], deletes: finalDeletes }
}

/**
 * Strikethrough-specific toggle. Unlike toggleHideModeForRange (used by
 * Hide), touching/overlapping strikethrough spans are treated as one
 * continuous region for both toggling and identity purposes: selecting a
 * range that touches or overlaps existing strikethrough annotations merges
 * them into a single annotation per distinct highlightColor/note; toggling
 * off part of a merged region splits it back into the remaining piece(s),
 * reusing the same splitting logic Hide already relies on.
 */
export function toggleStrikethroughForRange(
  annotations: Annotation[],
  selection: Selection
): AnnotationBatch {
  const { targetId, startOffset, endOffset, text } = selection
  console.log(
    'strikethrough toggle for',
    { targetId, startOffset, endOffset },
    annotations.filter(a => a.targetId === targetId)
  )
  if (startOffset >= endOffset) return { creates: [], updates: [], deletes: [] }

  const isFullyActive = isRangeFullyHideMode(annotations, targetId, startOffset, endOffset, 'strikethrough')
  const nextMode: HideMode = isFullyActive ? 'none' : 'strikethrough'

  const splitBatch = setHideModeForRange(annotations, targetId, startOffset, endOffset, nextMode, text)

  // Deselecting only ever shrinks/splits existing spans — setHideModeForRange
  // already does that correctly, and there's nothing new to merge.
  if (nextMode === 'none') return splitBatch

  const simulated = applyBatchLocally(annotations, splitBatch)
  const mergeBatch = mergeAdjacentStrikethrough(simulated, targetId)

  return combineBatches(splitBatch, mergeBatch)
}