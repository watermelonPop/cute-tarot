import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Annotation } from '../types'
import { getRangeFromOffsets } from '../lib/annotation/dom'
import NoteCard from './NoteCard'

const CARD_GAP_PX = 12

interface NotesPanelProps {
  annotations: Annotation[]
  onDeleteNote: (annotationId: string) => void
  onSelectAnnotation: (annotation: Annotation) => void
  focusedAnnotationId: string | null
  containerRef: RefObject<HTMLElement | null>
  onEditNote?: (annotationId: string, newText: string) => void
  onHeightChange?: (height: number) => void
}

function NotesPanel({ annotations, onDeleteNote, onSelectAnnotation, focusedAnnotationId, containerRef, onEditNote, onHeightChange }: NotesPanelProps) {
  const notedAnnotations = annotations
    .filter(a => !!a.note)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const cardsContainerRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [cardTops, setCardTops] = useState<Record<string, number>>({})

  // recomputePositions is defined before setCardRef needs it, so declare it
  // with useCallback first and reference it via a ref to avoid a circular
  // dependency between the two.
  const recomputePositionsRef = useRef<() => void>(() => {})
  const lastReportedHeightRef = useRef<number>(-1)

  const recomputePositions = useCallback(() => {
    // No notes to lay out — report a collapsed height immediately rather
    // than falling through to the ref checks below, since cardsContainerRef
    // never mounts when there's nothing to render (the component returns
    // null), which would otherwise silently skip the onHeightChange call
    // and leave the parent's reserved space stuck at its last value.
    if (notedAnnotations.length === 0) {
      setCardTops(prev => (Object.keys(prev).length === 0 ? prev : {}))
      if (lastReportedHeightRef.current !== 0) {
        lastReportedHeightRef.current = 0
        onHeightChange?.(0)
      }
      return
    }
    const container = containerRef.current
    const cardsContainer = cardsContainerRef.current
    if (!container || !cardsContainer) return

    const containerTop = cardsContainer.getBoundingClientRect().top

    const rawTops = notedAnnotations.map(a => {
      const target = container.querySelector<HTMLElement>(`[data-target-id="${a.targetId}"]`)
      if (!target) return { id: a.id, top: 0 }

      const charEnd = Math.min(a.startOffset + 1, a.endOffset)
      const startCharRange = getRangeFromOffsets(target, a.startOffset, charEnd)
      const rects = startCharRange?.getClientRects()
      const rectTop = (rects?.[0] ?? (startCharRange ?? target).getBoundingClientRect()).top
      return { id: a.id, top: rectTop - containerTop }
    })

    let cursor = -Infinity
    const next: Record<string, number> = {}
    const sortedByTop = [...rawTops].sort((a, b) => a.top - b.top)

    for (const { id, top } of sortedByTop) {
      const height = cardRefs.current.get(id)?.offsetHeight ?? 0
      const placedTop = Math.max(top, cursor)
      next[id] = placedTop
      cursor = placedTop + height + CARD_GAP_PX
    }

    setCardTops(prev => {
      const unchanged = notedAnnotations.every(a => prev[a.id] === next[a.id])
      return unchanged ? prev : next
    })

    // cursor currently sits just past the last card's bottom + gap (from
    // the loop above) — back out the trailing gap to get the actual
    // furthest-down pixel any card reaches, so callers can reserve exactly
    // enough space for it (0 when there are no cards).
    const maxBottom = sortedByTop.length > 0 ? cursor - CARD_GAP_PX : 0
    if (Math.abs(lastReportedHeightRef.current - maxBottom) > 0.5) {
      lastReportedHeightRef.current = maxBottom
      onHeightChange?.(maxBottom)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, containerRef])

  recomputePositionsRef.current = recomputePositions

  // One shared observer, reused across all cards — watches each card's own
  // rendered box (not just the outer container) so a height change from
  // entering/leaving edit mode, wrapping text, etc. triggers an immediate
  // re-stack instead of waiting on some unrelated re-render to paper over it.
  const cardResizeObserverRef = useRef<ResizeObserver | null>(null)
  if (!cardResizeObserverRef.current && typeof ResizeObserver !== 'undefined') {
    cardResizeObserverRef.current = new ResizeObserver(() => {
      recomputePositionsRef.current()
    })
  }

  const setCardRef = (id: string) => (el: HTMLDivElement | null) => {
    const observer = cardResizeObserverRef.current
    const prevEl = cardRefs.current.get(id)

    if (prevEl && prevEl !== el) observer?.unobserve(prevEl)

    if (el) {
      cardRefs.current.set(id, el)
      observer?.observe(el)
    } else {
      if (prevEl) observer?.unobserve(prevEl)
      cardRefs.current.delete(id)
    }
  }

  useLayoutEffect(() => {
    recomputePositions()
  }, [recomputePositions])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => recomputePositions())
    observer.observe(container)
    window.addEventListener('resize', recomputePositions)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', recomputePositions)
    }
  }, [containerRef, recomputePositions])

  // Clean up the shared card-observer on unmount.
  useEffect(() => {
    return () => cardResizeObserverRef.current?.disconnect()
  }, [])

  if (notedAnnotations.length === 0) return null

  return (
    <aside className="notesPanel">
      <div className="notesPanelCards" ref={cardsContainerRef}>
        {notedAnnotations.map(annotation => (
          <NoteCard
            key={annotation.id}
            ref={setCardRef(annotation.id)}
            annotation={annotation}
            focused={annotation.id === focusedAnnotationId}
            style={{
                position: 'absolute',
                top: cardTops[annotation.id] ?? 0,
                left: 0,
                right: 0,
                borderColor:
                    annotation.id === focusedAnnotationId
                    ? annotation.highlightColor
                    : undefined,
            }}
            onJumpTo={() => onSelectAnnotation(annotation)}
            onDelete={() => onDeleteNote(annotation.id)}
            onSaveEdit={newText => onEditNote?.(annotation.id, newText)}
          />
        ))}
      </div>
    </aside>
  )
}

export default NotesPanel