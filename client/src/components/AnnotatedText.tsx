import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEyeSlash, faEye, faNoteSticky } from '@fortawesome/free-solid-svg-icons'
import type { Annotation } from '../types'
import { buildAnnotationSegments } from '../lib/annotation/core'
import NoteCard from './NoteCard'

interface AnnotatedTextProps {
    text: string
    targetId: string
    annotations: Annotation[]
    // Mobile mode: notes expand inline (block-level, in document flow)
    // directly under their passage instead of rendering into the
    // side-rail NotesPanel. Requires onDeleteNote/onEditNote since the
    // expanded card exposes the same edit/delete controls the side panel does.
    inlineNotes?: boolean
    onDeleteNote?: (annotationId: string) => void
    onEditNote?: (annotationId: string, newText: string) => void
}

interface HiddenSegmentProps {
    text: string
}

/**
 * Renders one completely-hidden segment as a toggle button. Click persists
 * the reveal (revealed) until clicked again; hovering shows a transient
 * preview (hovering) that reverts once the mouse leaves, unless it's also
 * been click-revealed. Both states are local to this segment instance —
 * they're purely visual and never touch the annotation data itself.
 */
// Close (mouseleave) is debounced by this long — an ordinary hover-UX
// nicety (absorbs a jittery cursor at the button's own edge).
const HOVER_CLOSE_DEBOUNCE_MS = 150
// Matches the CSS max-width transition duration on .hiddenSegmentText, so
// the click-open preview animation (below) hands off to the full inline
// reveal exactly when the box-grow finishes, not before or after it.
const OPEN_PREVIEW_DURATION_MS = 350

function HiddenSegment({ text }: HiddenSegmentProps) {
    const [revealed, setRevealed] = useState(false)
    const [hovering, setHovering] = useState(false)
    // A click always happens while the mouse is still hovering the button,
    // so without this, toggling `revealed` off on a second click would be
    // masked by `hovering` still being true — the segment would only
    // actually re-hide once the mouse physically left the button. Any click
    // suppresses the hover preview's own say in visibility until the mouse
    // leaves and a fresh hover session begins.
    const [suppressHoverPreview, setSuppressHoverPreview] = useState(false)
    const visible = revealed || (hovering && !suppressHoverPreview)

    // Hover always previews at a small, fixed-cap width (.visible in CSS —
    // truncated, nowrap, clipped) regardless of text length: capped that
    // small, it can never grow large enough to force a paragraph reflow, so
    // there's no length past which it becomes unstable — no threshold
    // needed. Only a real click (.revealed in CSS) opens fully, since a
    // click isn't subject to the cursor-position feedback loop an in-flow
    // hover reflow would cause.
    //
    // The full-open reveal deliberately does NOT give itself any explicit
    // width at all, animated or not — not even inline-block sized close to
    // 100% width, because a wide inline-block still forces line breaks
    // before/after itself, which looks exactly like a block element on its
    // own line even though it technically isn't one (that's what "undid"
    // the inline fix: min(40rem,100%) is effectively full paragraph width).
    // And an *animated* nowrap width causes the earlier flicker (the box's
    // full intrinsic content width blows out ancestors for the whole
    // transition, only "resolving" once it settles).
    //
    // So .revealed switches straight to true `display:inline` — no width,
    // no box, text just flows as part of the paragraph immediately — and
    // the only thing animated is opacity, which is one of the few visual
    // properties `display:inline` still respects.
    //
    // Root fix for the open/close loop: hover tracking lives on the BUTTON
    // alone, not the wrapper (which also contains the growing/reflowing
    // text). The button never moves or resizes regardless of what the text
    // does, so its hit-region is permanently stable — there's nothing left
    // that can shift out from under the cursor while open, at any text
    // length. (A version of this that tracked hover on the whole wrapper,
    // even with a debounced close, still looped — debouncing only changes
    // the oscillation period when the underlying hit-region is itself
    // unstable, it doesn't stabilize it.)
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const cancelPendingClose = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = null
        }
    }

    useEffect(() => () => cancelPendingClose(), [])

    // On desktop, opening via click already looks animated "for free" —
    // the button's usually been hovered (and thus already mid-preview-grow)
    // for a moment before the click lands. On mobile there's no hover at
    // all, so a click jumps straight from closed to the full inline reveal
    // with nothing in between — abrupt. openPreview replays the same
    // small box-grow the hover preview uses immediately on click, then
    // hands off to the real (unconstrained, display:inline) reveal once
    // that grow finishes, so opening always looks the same regardless of
    // whether hover ever fired first.
    const [openPreview, setOpenPreview] = useState(false)
    const openPreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const cancelPendingOpenPreview = () => {
        if (openPreviewTimeoutRef.current) {
            clearTimeout(openPreviewTimeoutRef.current)
            openPreviewTimeoutRef.current = null
        }
    }

    useEffect(() => () => cancelPendingOpenPreview(), [])

    return (
        <span className="hiddenSegmentWrapper">
            <button
                type="button"
                className={visible ? 'hiddenSegmentToggleBtn openHiddenSegment' : "hiddenSegmentToggleBtn"}
                aria-label={visible ? 'Hide text' : 'Show hidden text'}
                tabIndex={-1}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseEnter={() => {
                    cancelPendingClose()
                    setHovering(true)
                }}
                onMouseLeave={() => {
                    // Small debounce here is just an ordinary hover-UX
                    // nicety (absorbs a jittery cursor at the button's own
                    // edge) — not load-bearing for the loop fix itself.
                    closeTimeoutRef.current = setTimeout(() => {
                        setHovering(false)
                        setSuppressHoverPreview(false)
                    }, HOVER_CLOSE_DEBOUNCE_MS)
                }}
                onClick={(e) => {
                    e.stopPropagation()
                    setSuppressHoverPreview(true)
                    setRevealed((r) => {
                        const next = !r
                        cancelPendingOpenPreview()
                        if (next) {
                            setOpenPreview(true)
                            openPreviewTimeoutRef.current = setTimeout(() => {
                                setOpenPreview(false)
                            }, OPEN_PREVIEW_DURATION_MS)
                        } else {
                            setOpenPreview(false)
                        }
                        return next
                    })
                }}
            >
                <FontAwesomeIcon icon={visible ? faEye : faEyeSlash} />
            </button>
            <span
                className={`hiddenSegmentText${visible ? ' visible' : ''}${revealed && !openPreview ? ' revealed' : ''}`}
            >
                {text}
            </span>
        </span>
    )
}

function AnnotatedText({ text, targetId, annotations, inlineNotes, onDeleteNote, onEditNote }: AnnotatedTextProps) {
    const relevant = (annotations ?? []).filter(a => a.targetId === targetId)
    const segments = buildAnnotationSegments(text, relevant)

    // Which segments (keyed by their start-end range) currently have their
    // inline note card expanded. Local/ephemeral — purely a display toggle,
    // same as HiddenSegment's reveal state above.
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const toggleExpanded = (key: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    return (
        <>
            {segments.map(segment => {
                const key = `${segment.startOffset}-${segment.endOffset}`

                if (segment.completelyHidden) {
                    return <HiddenSegment key={key} text={segment.text} />
                }

                // A note-bearing annotation can span multiple segments if its
                // range overlaps a different annotation whose boundary falls
                // partway through it (buildAnnotationSegments splits at every
                // annotation boundary, not just note ones). Only render the
                // toggle in the segment that reaches the annotation's actual
                // end — every annotation's endOffset is always a boundary
                // point, so exactly one segment satisfies this per note —
                // otherwise the same note's button/expansion renders once per
                // segment it happens to touch.
                const notedAnnotations = inlineNotes
                    ? relevant.filter(a => segment.annotationIds.includes(a.id) && !!a.note && a.endOffset === segment.endOffset)
                    : []

                return (
                    <span key={key}>
                        <span
                            className={segment.annotationIds.length > 0 ? 'annotatedSegment' : undefined}
                            style={{
                                textDecoration: segment.struckThrough ? 'line-through' : undefined,
                                backgroundColor: segment.highlightColor,
                            }}
                        >
                            {segment.text}
                        </span>

                        {notedAnnotations.length > 0 && (
                            <button
                                type="button"
                                className={`inlineNoteToggleBtn${expanded.has(key) ? ' active' : ''}`}
                                aria-label={expanded.has(key) ? 'Hide note' : 'Show note'}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpanded(key)
                                }}
                            >
                                <FontAwesomeIcon icon={faNoteSticky} />
                            </button>
                        )}

                        {notedAnnotations.length > 0 && expanded.has(key) && (
                            <span className="inlineNoteExpansion">
                                {notedAnnotations.map(annotation => (
                                    <NoteCard
                                        key={annotation.id}
                                        annotation={annotation}
                                        onJumpTo={() => {}}
                                        onDelete={() => onDeleteNote?.(annotation.id)}
                                        onSaveEdit={newText => onEditNote?.(annotation.id, newText)}
                                    />
                                ))}
                            </span>
                        )}
                    </span>
                )
            })}
        </>
    )
}

export default AnnotatedText