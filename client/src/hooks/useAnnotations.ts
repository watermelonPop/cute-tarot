import type { Reading } from '../types'
import { authFetch } from '../lib/authFetch'
import type { PendingSelection } from './useAnnotationSelection'
import { findAnnotationAtSelection, serializeAnnotationForApi, isAnnotationEmpty } from '../lib/annotation/core'
import { DEFAULT_HIGHLIGHT_COLOR } from '../lib/annotation/colors'
import {
    toggleHideModeForRange,
    toggleHighlight,
    setNoteForSelection,
    type AnnotationBatch,
    type AnnotationMutation,
    toggleStrikethroughForRange,
} from '../lib/annotation/mutations'

interface UseAnnotationsParams {
    readingId: string | undefined
    token: string | null
    reading: Reading | null
    setReading: (reading: Reading) => void
    showAlert: (msg: string) => void
    clearSelectionToolbar: () => void
    // When false (reading not yet saved to the DB — not logged in, or the
    // POST hasn't resolved), annotation edits are applied to `reading` in
    // memory only, since there's no real readingId to persist against yet.
    persistRemotely: boolean
}

/**
 * Applies a single mutation to a reading's annotations array locally,
 * without touching the network. Mirrors what the backend's create/update/
 * delete routes each do, so local-only edits (unsaved readings) and
 * server-backed edits (saved readings) produce the same resulting shape.
 */
function applyMutationLocally(reading: Reading, mutation: AnnotationMutation): Reading {
    if (mutation.action === 'noop') return reading

    if (mutation.action === 'create') {
        return { ...reading, annotations: [...reading.annotations, mutation.annotation] }
    }

    if (mutation.action === 'update') {
        return {
        ...reading,
        annotations: reading.annotations.map(a => (a.id === mutation.annotation.id ? mutation.annotation : a)),
        }
    }

    // delete
    return {
        ...reading,
        annotations: reading.annotations.filter(a => a.id !== mutation.annotationId),
    }
}

/**
 * Wraps the annotation mutation API (create/update/delete) and exposes the
 * three toolbar actions (hide, strikethrough, highlight) as ready-to-bind
 * handlers that read the current pending selection.
 */
export function useAnnotations({
    readingId,
    token,
    reading,
    setReading,
    showAlert,
    clearSelectionToolbar,
    persistRemotely,
}: UseAnnotationsParams) {
    const applyMutation = async (mutation: AnnotationMutation) => {
        if (mutation.action === 'noop') return

        if (!persistRemotely) {
            if (!reading) return
            const next = applyMutationLocally(reading, mutation)
            console.log('local mutation applied, new annotations:', next.annotations) // TEMP DEBUG
            setReading(next)
            return
        }

        try {
        const updatedReading = await (
            mutation.action === 'create'
            ? authFetch<Reading>(`/api/readings/${readingId}/annotations`, token, {
                method: 'POST',
                body: JSON.stringify(serializeAnnotationForApi(mutation.annotation)),
                })
            : mutation.action === 'update'
            ? authFetch<Reading>(`/api/readings/${readingId}/annotations/${mutation.annotation.id}`, token, {
                method: 'PATCH',
                body: JSON.stringify(serializeAnnotationForApi(mutation.annotation)),
                })
            : authFetch<Reading>(`/api/readings/${readingId}/annotations/${mutation.annotationId}`, token, {
                method: 'DELETE',
                })
        )
            console.log('remote mutation applied, new annotations:', updatedReading.annotations)
        setReading(updatedReading)
        } catch (err) {
        console.error('Failed to update annotation:', err)
        showAlert('Failed to update annotation. Please try again.')
        }
    }

    const applyBatch = async (batch: AnnotationBatch) => {
        if (!persistRemotely) {
            if (!reading) return

            let current = reading
            for (const id of batch.deletes) {
            current = applyMutationLocally(current, { action: 'delete', annotationId: id })
            }
            for (const annotation of batch.updates) {
            current = applyMutationLocally(current, { action: 'update', annotation })
            }
            for (const annotation of batch.creates) {
            current = applyMutationLocally(current, { action: 'create', annotation })
            }

            setReading(current)
            return
        }

        for (const id of batch.deletes) {
            await applyMutation({ action: 'delete', annotationId: id })
        }
        for (const annotation of batch.updates) {
            await applyMutation({ action: 'update', annotation })
        }
        for (const annotation of batch.creates) {
            await applyMutation({ action: 'create', annotation })
        }
    }

    const withSelection = (fn: (selection: PendingSelection) => AnnotationBatch | AnnotationMutation) =>
        (pendingSelection: PendingSelection | null) => {
        if (!pendingSelection || !reading) return

        const result = fn(pendingSelection)

        clearSelectionToolbar()
        window.getSelection()?.removeAllRanges()

        if ('action' in result) {
            applyMutation(result)
        } else {
            applyBatch(result)
        }
    }

    const handleHide = withSelection(selection =>
        toggleHideModeForRange(reading!.annotations, 'hidden', selection)
    )

    const handleStrikethrough = withSelection(selection =>
        toggleStrikethroughForRange(reading!.annotations, selection)
    )

    const handleHighlight = (pendingSelection: PendingSelection | null, color?: string) => {
        if (!pendingSelection || !reading) return

        const existing = findAnnotationAtSelection(
            reading.annotations,
            pendingSelection.targetId,
            pendingSelection.startOffset,
            pendingSelection.endOffset
        )

        const mutation = toggleHighlight(
            existing,
            color ?? DEFAULT_HIGHLIGHT_COLOR,
            pendingSelection,
            { toggleOffOnAnyColor: color === undefined }
        )

        clearSelectionToolbar()
        window.getSelection()?.removeAllRanges()
        applyMutation(mutation)
    }

    const handleNote = (pendingSelection: PendingSelection | null, noteText: string) => {
        if (!pendingSelection || !reading) return

        const existing = findAnnotationAtSelection(
            reading.annotations,
            pendingSelection.targetId,
            pendingSelection.startOffset,
            pendingSelection.endOffset
        )

        const mutation = setNoteForSelection(existing, noteText, pendingSelection)

        clearSelectionToolbar()
        window.getSelection()?.removeAllRanges()
        applyMutation(mutation)
    }

    const handleDeleteAnnotationNote = (annotationId: string) => {
        const existing = reading?.annotations.find(a => a.id === annotationId)
        if (!existing) return

        const updated = { ...existing, note: undefined }

        applyMutation(
            isAnnotationEmpty(updated) ? { action: 'delete', annotationId } : { action: 'update', annotation: updated }
        )
    }

    const handleEditAnnotationNote = (annotationId: string, newText: string) => {
        const existing = reading?.annotations.find(a => a.id === annotationId)
        if (!existing) return

        // An empty save is treated the same as deleting the note (mirrors
        // setNoteForSelection's behavior for the create/edit-via-toolbar path).
        const trimmed = newText.trim()
        const updated = { ...existing, note: trimmed === '' ? undefined : trimmed }

        applyMutation(
            isAnnotationEmpty(updated) ? { action: 'delete', annotationId: existing.id } : { action: 'update', annotation: updated }
        )
    }

    return {
        applyMutation,
        applyBatch,
        handleHide,
        handleStrikethrough,
        handleHighlight,
        handleNote,
        handleDeleteAnnotationNote,
        handleEditAnnotationNote,
    }
}