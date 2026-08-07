export const CLICK_MAX_DURATION_MS = 350
export const CLICK_MAX_MOVEMENT_PX = 6

/**
 * Given the DOM element that holds a target's raw text and a Range within
 * it, compute plain-character start/end offsets relative to that element's
 * text content, independent of any nested markup (e.g. annotation spans
 * already rendered inside it). Call this from your selection/mouseup
 * handler once you've resolved the ancestor element with the matching
 * data-target-id.
 */
export function getPlainTextOffsets(
  container: HTMLElement,
  range: Range
): { startOffset: number; endOffset: number; text: string } {
  const preStartRange = range.cloneRange()
  preStartRange.selectNodeContents(container)
  preStartRange.setEnd(range.startContainer, range.startOffset)
  const startOffset = preStartRange.toString().length

  const text = range.toString()
  const endOffset = startOffset + text.length

  return { startOffset, endOffset, text }
}

/**
 * Resolves the plain-text character offset at a screen point within a
 * container, using the browser's caret-hit-testing APIs. Returns null if
 * the point doesn't land inside the container's text (or the browser
 * supports neither API).
 */
export function getPlainTextOffsetAtPoint(
  container: HTMLElement,
  clientX: number,
  clientY: number
): number | null {
  let caretNode: Node | null = null
  let caretOffset = 0

  if (typeof (document as any).caretRangeFromPoint === 'function') {
    const range = (document as any).caretRangeFromPoint(clientX, clientY) as Range | null
    if (!range) return null
    caretNode = range.startContainer
    caretOffset = range.startOffset
  } else if (typeof (document as any).caretPositionFromPoint === 'function') {
    const pos = (document as any).caretPositionFromPoint(clientX, clientY)
    if (!pos) return null
    caretNode = pos.offsetNode
    caretOffset = pos.offset
  } else {
    return null
  }

  if (!caretNode || !container.contains(caretNode)) return null

  const preRange = document.createRange()
  preRange.selectNodeContents(container)
  preRange.setEnd(caretNode, caretOffset)

  return preRange.toString().length
}

/**
 * Inverse of getPlainTextOffsets: builds a DOM Range spanning [start, end)
 * plain-text offsets within a container, so a stored annotation's offsets
 * can be turned back into a real, visually-selectable Range.
 */
export function getRangeFromOffsets(
  container: HTMLElement,
  start: number,
  end: number
): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let charCount = 0
  let startNode: Node | null = null
  let startNodeOffset = 0
  let endNode: Node | null = null
  let endNodeOffset = 0

  const nodes: Node[] = []
  let node: Node | null
  while ((node = walker.nextNode())) nodes.push(node)

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    const length = n.textContent?.length ?? 0
    const nextCount = charCount + length
    const isLastNode = i === nodes.length - 1

    // For the START boundary, prefer the START of the *next* node when the
    // offset lands exactly on a boundary — don't anchor at the tail end of
    // the current node unless this is the last node in the container.
    if (startNode === null && (start < nextCount || (isLastNode && start <= nextCount))) {
      startNode = n
      startNodeOffset = start - charCount
    }
    if (endNode === null && (end < nextCount || (isLastNode && end <= nextCount))) {
      endNode = n
      endNodeOffset = end - charCount
      break
    }

    charCount = nextCount
  }

  if (!startNode || !endNode) return null

  const range = document.createRange()
  range.setStart(startNode, startNodeOffset)
  range.setEnd(endNode, endNodeOffset)
  return range
}
