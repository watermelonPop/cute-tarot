import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import type { Reading, Annotation } from '../types'
import {
  CLICK_MAX_DURATION_MS,
  CLICK_MAX_MOVEMENT_PX,
  getPlainTextOffsetAtPoint,
  getPlainTextOffsets,
  getRangeFromOffsets,
} from '../lib/annotation/dom'
import {
  findAnnotationAtSelection,
  selectionOverlapsHiddenAnnotation,
} from '../lib/annotation/core'

export interface PendingSelection {
  targetId: string
  startOffset: number
  endOffset: number
  text: string
  toolbarX: number
  toolbarY: number
}

// Manually animates window scroll over `duration`, invoking onFrame with
// the incremental delta each tick. Used instead of native smooth-scrolling
// so callers can keep other fixed-position UI (like the toolbar) in sync
// frame-by-frame — native smooth scroll gives no such callback.
function animateScrollBy(delta: number, duration: number, onFrame: (stepDelta: number) => void) {
  const start = performance.now()
  let lastEased = 0

  // ease-out cubic
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)

  const tick = (now: number) => {
    const elapsed = now - start
    const t = Math.min(elapsed / duration, 1)
    const eased = ease(t) * delta

    const stepDelta = eased - lastEased
    lastEased = eased

    window.scrollBy({ top: stepDelta, behavior: 'auto' })
    onFrame(stepDelta)

    if (t < 1) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

export function useAnnotationSelection(
  containerRef: RefObject<HTMLElement | null>,
  reading: Reading | null
) {
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null)
  const [highlightSubmenuOpen, setHighlightSubmenuOpen] = useState(false)
  const [noteSubmenuOpen, setNoteSubmenuOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const mouseDownInfoRef = useRef<{ time: number; x: number; y: number } | null>(null)
  // Guards against a stale settle-poll from a previous card click still
  // running (and overwriting) when the user clicks a second card quickly.
  const selectRequestIdRef = useRef(0)

  const clearSelectionToolbar = () => setPendingSelection(null)

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    mouseDownInfoRef.current = { time: Date.now(), x: e.clientX, y: e.clientY }
  }

  const resolveTargetElementAtPoint = (clientX: number, clientY: number): HTMLElement | null => {
    let targetEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null

    while (targetEl && !targetEl.dataset.targetId) {
      targetEl = targetEl.parentElement
    }

    if (!targetEl || !containerRef.current?.contains(targetEl)) return null
    return targetEl
  }

  const handleAnnotationClick = (clientX: number, clientY: number) => {
    if (!reading) return

    const targetEl = resolveTargetElementAtPoint(clientX, clientY)
    if (!targetEl) {
      clearSelectionToolbar()
      return
    }

    const targetId = targetEl.dataset.targetId!
    const clickOffset = getPlainTextOffsetAtPoint(targetEl, clientX, clientY)
    if (clickOffset === null) {
      clearSelectionToolbar()
      return
    }

    const covering = reading.annotations
      .filter(a => a.targetId === targetId && a.startOffset <= clickOffset && a.endOffset > clickOffset)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    const match = covering[covering.length - 1]
    if (!match) {
      clearSelectionToolbar()
      return
    }

    const range = getRangeFromOffsets(targetEl, match.startOffset, match.endOffset)
    if (!range) {
      clearSelectionToolbar()
      return
    }

    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)

    const rect = range.getBoundingClientRect()

    setPendingSelection({
      targetId,
      startOffset: match.startOffset,
      endOffset: match.endOffset,
      text: match.text,
      toolbarX: rect.left + rect.width / 2,
      toolbarY: rect.top,
    })
  }

  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection()
    const mouseDownInfo = mouseDownInfoRef.current
    mouseDownInfoRef.current = null

    const wasQuickClick =
      !!mouseDownInfo &&
      Date.now() - mouseDownInfo.time <= CLICK_MAX_DURATION_MS &&
      Math.hypot(e.clientX - mouseDownInfo.x, e.clientY - mouseDownInfo.y) <= CLICK_MAX_MOVEMENT_PX

    if (!selection || selection.rangeCount === 0) {
      clearSelectionToolbar()
      return
    }

    if (selection.isCollapsed) {
      if (wasQuickClick) {
        handleAnnotationClick(e.clientX, e.clientY)
      } else {
        clearSelectionToolbar()
      }
      return
    }

    showToolbarForRange(selection.getRangeAt(0))
  }

  /**
   * Shared by both the mouse-based open-range branch of handleTextSelection
   * above and the touch-based selectionchange listener below — everything
   * from here down is agnostic to how the selection was made.
   */
  const showToolbarForRange = (range: Range): void => {
    const selectedText = range.toString()

    if (selectedText.trim() === '') {
      clearSelectionToolbar()
      return
    }

    let node: Node | null = range.commonAncestorContainer
    let targetEl: HTMLElement | null =
      node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement

    while (targetEl && !targetEl.dataset.targetId) {
      targetEl = targetEl.parentElement
    }

    if (!targetEl || !containerRef.current?.contains(targetEl)) {
      clearSelectionToolbar()
      return
    }

    const targetId = targetEl.dataset.targetId!
    const { startOffset, endOffset, text } = getPlainTextOffsets(targetEl, range)

    if (reading) {
      const exactMatch = findAnnotationAtSelection(reading.annotations, targetId, startOffset, endOffset)
      const overlapsHidden = selectionOverlapsHiddenAnnotation(reading.annotations, targetId, startOffset, endOffset)

      if (overlapsHidden && exactMatch?.hideMode !== 'hidden') {
        clearSelectionToolbar()
        return
      }
    }

    const rect = range.getBoundingClientRect()

    setPendingSelection({
      targetId,
      startOffset,
      endOffset,
      text,
      toolbarX: rect.left + rect.width / 2,
      toolbarY: rect.top,
    })
  }

  /**
   * Programmatically re-selects a stored annotation's passage (e.g. from a
   * NoteCard click), scrolls it into view, and opens the toolbar once the
   * scroll has actually settled — rather than measuring the passage's
   * position before a smooth scroll finishes, which is what caused the
   * toolbar to consistently open one step "behind" where it should.
   */
  const selectAnnotationAndOpenToolbar = (annotation: Annotation) => {
    const targetEl = containerRef.current?.querySelector<HTMLElement>(
        `[data-target-id="${annotation.targetId}"]`
    )
    if (!targetEl) return

    const range = getRangeFromOffsets(targetEl, annotation.startOffset, annotation.endOffset)
    if (!range) return

    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)

    // Scroll based on the annotation's own rect, not the whole paragraph —
    // and reserve rough space above it for the toolbar (which renders above
    // rect.top). This is just a first pass; the toolbar-mount effect below
    // corrects it once we know the toolbar's real height.
    const ESTIMATED_TOOLBAR_SPACE = 120
    const initialRect = range.getBoundingClientRect()
    const target = window.scrollY + initialRect.top - ESTIMATED_TOOLBAR_SPACE
    window.scrollTo({ top: Math.max(target, 0), behavior: 'smooth' })

    const requestId = ++selectRequestIdRef.current
    let lastTop = -Infinity
    let stableFrames = 0

    const settle = () => {
        if (selectRequestIdRef.current !== requestId) return

        const rect = range.getBoundingClientRect()
        stableFrames = Math.abs(rect.top - lastTop) < 0.5 ? stableFrames + 1 : 0
        lastTop = rect.top

        if (stableFrames >= 3) {
        setPendingSelection({
            targetId: annotation.targetId,
            startOffset: annotation.startOffset,
            endOffset: annotation.endOffset,
            text: annotation.text,
            toolbarX: rect.left + rect.width / 2,
            toolbarY: rect.top,
        })
        return
        }
        requestAnimationFrame(settle)
    }
    requestAnimationFrame(settle)
    }

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element
      const insideToolbar = toolbarRef.current?.contains(target)
      // NoteModal/HighlightColorModal portal to document.body (to escape
      // the toolbar's own transformed positioning context), so they're
      // never inside toolbarRef's DOM subtree — without this check, any
      // mousedown inside them (typing in the textarea, clicking a swatch,
      // clicking Save) would look like an "outside" click and clear the
      // selection before the button's own onClick even runs.
      const insidePortaledModal = target.closest?.('.mini-modal')

      if (!insideToolbar && !insidePortaledModal) {
        clearSelectionToolbar()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Mobile text selection is made via a long-press + native drag handles —
  // that UI is the browser's own overlay, not part of our DOM, so it never
  // fires mousedown/mouseup on the container the way a mouse drag does.
  // handleTextSelection (wired to onMouseUp in the panels) simply never
  // runs on touch as a result — nothing was broken, there was just no event
  // to react to in the first place.
  //
  // selectionchange is the one event that reliably fires for ANY selection
  // change regardless of input method, including adjusting the native
  // handles — so it's the standard way to detect a touch selection.
  // Debounced, since it fires continuously while a handle is being dragged;
  // only act once it's settled, mirroring how mouseup only fires once a
  // mouse-drag gesture finishes.
  //
  // Scoped to touch-capable devices only — desktop already has a working,
  // deliberately mouseup-gated flow (showing the toolbar only once the
  // drag finishes), and running this unscoped would also fire on desktop,
  // popping the toolbar up mid-drag after any 300ms pause instead of
  // waiting for mouseup.
  useEffect(() => {
    if (!('ontouchstart' in window)) return

    let debounceId: ReturnType<typeof setTimeout> | null = null
    const SELECTION_SETTLE_DELAY_MS = 300

    const handleSelectionChange = () => {
      if (debounceId) clearTimeout(debounceId)
      debounceId = setTimeout(() => {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return

        const anchorNode = selection.anchorNode
        if (!anchorNode || !containerRef.current?.contains(anchorNode)) return

        showToolbarForRange(selection.getRangeAt(0))
      }, SELECTION_SETTLE_DELAY_MS)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      if (debounceId) clearTimeout(debounceId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading])

  useEffect(() => {
    setHighlightSubmenuOpen(false)
    setNoteSubmenuOpen(false)
  }, [pendingSelection?.targetId, pendingSelection?.startOffset, pendingSelection?.endOffset])

    // Once the toolbar is mounted and positioned, nudge the scroll a bit
  // further if its real (measured) height still means it's clipped at the
  // top of the viewport. Because the toolbar is position:fixed, scrolling
  // alone doesn't move it — its `top` is a fixed pixel value in state — so
  // we have to bump toolbarY by the same delta as the scroll, in the same
  // tick, or the toolbar stays stuck at its old (clipped) spot while the
  // text slides out from under it.
  useLayoutEffect(() => {
    if (!pendingSelection || !toolbarRef.current) return

    const toolbarRect = toolbarRef.current.getBoundingClientRect()
    const SAFE_TOP_MARGIN = 8

    if (toolbarRect.top < SAFE_TOP_MARGIN) {
      const delta = SAFE_TOP_MARGIN - toolbarRect.top

      animateScrollBy(-delta, 200, stepDelta => {
        setPendingSelection(prev =>
          prev ? { ...prev, toolbarY: prev.toolbarY + -stepDelta } : prev
        )
      })
    }
  }, [pendingSelection?.targetId, pendingSelection?.startOffset, pendingSelection?.endOffset])

  return {
    pendingSelection,
    clearSelectionToolbar,
    toolbarRef,
    highlightSubmenuOpen,
    setHighlightSubmenuOpen,
    noteSubmenuOpen,
    setNoteSubmenuOpen,
    handleContainerMouseDown,
    handleTextSelection,
    selectAnnotationAndOpenToolbar,
  }
}