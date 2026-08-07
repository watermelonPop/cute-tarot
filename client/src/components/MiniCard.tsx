import { useState, useRef, useLayoutEffect } from 'react'
import './MiniCard.css'
import type { User, Deck, Card } from '../types'
import { useNavigate } from 'react-router-dom'

interface MiniCardProps {
  user: User | null
  selectedDeck: Deck | null
  card: Card
}

function useEvenLineClamp(childCount: number) {
  const groupRef = useRef<HTMLDivElement | null>(null)
  const [itemStyle, setItemStyle] = useState<React.CSSProperties | null>(null)

  useLayoutEffect(() => {
    const groupEl = groupRef.current
    if (!groupEl) return

    const compute = () => {
      const firstChild = groupEl.children[0] as HTMLElement | undefined
      if (!firstChild) return

      const groupStyle = getComputedStyle(groupEl)
      const gap = parseFloat(groupStyle.rowGap || groupStyle.gap) || 0
      const totalGap = gap * (childCount - 1)

      // Measure the STABLE group container, never the children we're about to mutate
      const groupHeight = groupEl.getBoundingClientRect().height;
      const perItemHeight = (groupHeight - totalGap) / childCount

      const childStyle = getComputedStyle(firstChild)
      const paddingTop = parseFloat(childStyle.paddingTop) || 0
      const paddingBottom = parseFloat(childStyle.paddingBottom) || 0
      const lineHeight = parseFloat(childStyle.lineHeight) || 1

      const contentHeight = perItemHeight - paddingTop - paddingBottom
        const lines = Math.max(
            1,
            Math.floor(contentHeight / lineHeight)
        );
        const safety = 500;
        const exactHeight =
            lines * lineHeight + paddingTop + paddingBottom - safety;
      setItemStyle({
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: lines,
        overflow: 'hidden',
        boxSizing: 'border-box',
        height: `${exactHeight}px`,
      } as React.CSSProperties)
    }

    compute()

    // Recompute once webfonts finish loading — line-height/glyph metrics can
    // shift after swap, changing how much text fits even if box size doesn't.
    if (document.fonts) {
      document.fonts.ready.then(compute)
    }

    const observer = new ResizeObserver(compute)
    observer.observe(groupEl) // observing the GROUP, never the children being styled
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childCount])

  return { groupRef, itemStyle }
}

function MiniCard({ selectedDeck, card}: MiniCardProps) {
    const navigate = useNavigate()
    const { groupRef, itemStyle } = useEvenLineClamp(2)
    // The app's own loader only ever covered the /api/cards+/api/decks
    // fetch, not the actual image bytes — so the moment it clears, ~78 of
    // these mount at once and each one paints in raw as its bytes stream
    // over the network, top to bottom, looking broken. Fading each image in
    // only once it's actually finished loading (rather than showing it
    // mid-decode) hides that same artifact at the per-image level instead.
    const [imgLoaded, setImgLoaded] = useState(false)

    if (!selectedDeck || !card) {
        return <p>Loading</p>
    }

    return (
        <div
            className="cardOuter"
            onClick={() => {
                navigate(`/cards/${card.nameShort}`)
            }}
            >

        <div className="cardFlip">
            {/* FRONT */}
            <div className="cardFace cardFront">
                <div className="modalCardImgOuter">
                    <div className='cardImgOuter'>
                        <img
                            src={`${selectedDeck.images['card-front']}/${card.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                            className={`cardImg${imgLoaded ? ' loaded' : ''}`}
                            alt={`${card.name}`}
                            onLoad={() => setImgLoaded(true)}
                            onError={() => setImgLoaded(true)}
                        />
                    </div>
                </div>
                <p className="cardDesc">
                    {card.value} – {card.type}
                </p>
            </div>

            {/* BACK */}
            <div className="cardFace cardBack">
                <h4 className="cardTitle">{card.name}</h4>
                <p className="cardDescBack">
                    {card.value} – {card.type}
                </p>
                <h4 className="cardBackTitle">Keywords</h4>
                <div className="cardKeywordsGroup" ref={groupRef}>
                    <p
                        className="cardKeywords"
                        style={itemStyle ?? undefined}
                    >
                        <strong>Upright:</strong> {card.keywordsUp}
                    </p>
                    <p
                        className="cardKeywords"
                        style={itemStyle ?? undefined}
                    >
                        <strong>Reversed:</strong> {card.keywordsRev}
                    </p>
                </div>
            </div>
        </div>
        </div>
    )
}

export default MiniCard