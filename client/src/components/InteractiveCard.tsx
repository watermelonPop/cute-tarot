import { useRef, useEffect, useCallback, useState } from 'react'
import './InteractiveCard.css'

interface InteractiveCardProps {
  front: string
  back: string
  edgeColor?: string
}

const DRAG_SENSITIVITY = 0.4
const INERTIA_FRICTION = 0.95
const INERTIA_MIN_VELOCITY = 0.02
const SPRING_STIFFNESS = 0.08
const SPRING_DAMPING = 0.72
const MAX_TILT_X = 40
const GRAB_SCALE = 1.04
const REST_X = -10
const FRONT_REST_Y = 20
const BACK_REST_Y = FRONT_REST_Y + 180

const WIGGLE_DURATION = 1400
const WIGGLE_AMOUNT_Y = 18
const WIGGLE_AMOUNT_X = 6

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

function useImageBrightness(src: string) {
  const [brightness, setBrightness] = useState(0.5) // 0 (black) .. 1 (white), default neutral

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous' // requires the image server to send CORS headers
    img.src = src

    img.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        // Sample at a small fixed size — we only need an average, not full resolution
        canvas.width = 32
        canvas.height = 32
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0, 32, 32)
        const { data } = ctx.getImageData(0, 0, 32, 32)

        let total = 0
        for (let i = 0; i < data.length; i += 4) {
          // Perceived luminance weighting
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          total += (0.299 * r + 0.587 * g + 0.114 * b) / 255
        }

        const avg = total / (data.length / 4)
        if (!cancelled) setBrightness(avg)
      } catch (err) {
        // Canvas will throw a security error if the image isn't CORS-enabled —
        // fall back to the neutral default rather than crashing
        console.warn('Could not sample image brightness (likely a CORS restriction):', err)
      }
    }

    return () => { cancelled = true }
  }, [src])

  return brightness
}

function InteractiveCard({ front, back, edgeColor }: InteractiveCardProps) {
  const frontBrightness = useImageBrightness(front)
  const backBrightness = useImageBrightness(back)
    const wrapperRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const frontLightRef = useRef<HTMLDivElement | null>(null)
  const backLightRef = useRef<HTMLDivElement | null>(null)
  const shadowRef = useRef<HTMLDivElement | null>(null)
  const frontHoloRef = useRef<HTMLDivElement | null>(null)
  const backHoloRef = useRef<HTMLDivElement | null>(null)
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const lastMoveTime = useRef(0)
  const lastTapTime = useRef(0)

  const rotation = useRef({ x: REST_X, y: FRONT_REST_Y })
  const velocity = useRef({ x: 0, y: 0 })
  const facing = useRef<'front' | 'back'>('front')
  const springTarget = useRef<{ x: number; y: number } | null>(null)
  const animFrame = useRef<number | null>(null)
  const wiggleFrame = useRef<number | null>(null)

  const applyTransform = useCallback(() => {
    const { x, y } = rotation.current

    if (cardRef.current) {
      cardRef.current.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`
    }

    const lightX = y * 0.5
    const lightY = x * 0.5
    const gradient = `radial-gradient(circle at ${50 + lightX}% ${50 - lightY}%, rgba(255,255,255,0.75), rgba(0,0,0,0.45))`
    if (frontLightRef.current) frontLightRef.current.style.background = gradient
    if (backLightRef.current) backLightRef.current.style.background = gradient

    // ---- Holographic rainbow sheen ----
    // Diagonal angle shifts with Y-rotation; sheen band position shifts opposite X-rotation
    const normX = x / MAX_TILT_X
    const normY = (((y % 360) + 360) % 360) / 360
    const tiltMagnitude = Math.min(1, Math.abs(normX))

    const holoAngle = 115 + normY * 360
    const holoPosX = 50 + normX * 40
    const holoPosY = 50 - (y % 90) * 0.6

    // Brighter cards get a stronger boost; dark cards stay closer to the base intensity
    const frontBoost = 1 + Math.max(0, frontBrightness - 0.4) * 3 // steeper, slightly higher threshold
    const backBoost = 1 + Math.max(0, backBrightness - 0.4) * 3

    const baseOpacity = 0.12 + tiltMagnitude * 0.18
    const frontHoloOpacity = Math.min(0.8, baseOpacity * frontBoost) // higher ceiling
    const backHoloOpacity = Math.min(0.8, baseOpacity * backBoost)

    const makeGradient = (opacity: number) => `
      linear-gradient(
        ${holoAngle}deg,
        rgba(255,0,150,0) 0%,
        rgba(255,0,150,${opacity}) 20%,
        rgba(255,220,0,${opacity}) 35%,
        rgba(0,255,180,${opacity}) 50%,
        rgba(0,150,255,${opacity}) 65%,
        rgba(200,0,255,${opacity}) 80%,
        rgba(255,0,150,0) 100%
      )
    `

    if (frontHoloRef.current) {
      frontHoloRef.current.style.background = makeGradient(frontHoloOpacity)
      frontHoloRef.current.style.backgroundPosition = `${holoPosX}% ${holoPosY}%`
    }
    if (backHoloRef.current) {
      backHoloRef.current.style.background = makeGradient(backHoloOpacity)
      backHoloRef.current.style.backgroundPosition = `${holoPosX}% ${holoPosY}%`
    }

    // ---- Shadow ----
    if (shadowRef.current) {
      const shadowOffsetX = -normX * 30
      const blur = 16 + tiltMagnitude * 10
      const opacity = 0.5 - tiltMagnitude * 0.15
      const scale = 1 - tiltMagnitude * 0.15

      shadowRef.current.style.transform = `translateX(calc(-50% + ${shadowOffsetX}px)) scale(${scale})`
      shadowRef.current.style.filter = `blur(${blur}px)`
      shadowRef.current.style.opacity = `${opacity}`
    }
  }, [])

  const stopAnimLoop = useCallback(() => {
    if (animFrame.current !== null) {
      cancelAnimationFrame(animFrame.current)
      animFrame.current = null
    }
  }, [])

  const runAnimLoop = useCallback(() => {
    const step = () => {
      if (isDragging.current) {
        animFrame.current = null
        return
      }

      if (springTarget.current) {
        const target = springTarget.current
        const dx = target.x - rotation.current.x
        const dy = target.y - rotation.current.y

        velocity.current.x = velocity.current.x * SPRING_DAMPING + dx * SPRING_STIFFNESS
        velocity.current.y = velocity.current.y * SPRING_DAMPING + dy * SPRING_STIFFNESS

        rotation.current.x += velocity.current.x
        rotation.current.y += velocity.current.y
        applyTransform()

        const settled =
          Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 &&
          Math.abs(velocity.current.x) < 0.05 && Math.abs(velocity.current.y) < 0.05

        if (settled) {
          rotation.current = { x: target.x, y: target.y }
          velocity.current = { x: 0, y: 0 }
          applyTransform()
          springTarget.current = null
          animFrame.current = null
          return
        }

        animFrame.current = requestAnimationFrame(step)
        return
      }

      rotation.current.x += velocity.current.x
      rotation.current.y += velocity.current.y

      if (rotation.current.x > MAX_TILT_X) {
        rotation.current.x = MAX_TILT_X
        velocity.current.x = 0
      } else if (rotation.current.x < -MAX_TILT_X) {
        rotation.current.x = -MAX_TILT_X
        velocity.current.x = 0
      }

      velocity.current.x *= INERTIA_FRICTION
      velocity.current.y *= INERTIA_FRICTION
      applyTransform()

      const speed = Math.hypot(velocity.current.x, velocity.current.y)

      if (speed < INERTIA_MIN_VELOCITY) {
        const normY = normalizeAngle(rotation.current.y)
        const distToFront = Math.min(Math.abs(normY - FRONT_REST_Y), 360 - Math.abs(normY - FRONT_REST_Y))
        const distToBack = Math.min(Math.abs(normY - BACK_REST_Y), 360 - Math.abs(normY - BACK_REST_Y))
        const nearestIsFront = distToFront <= distToBack
        facing.current = nearestIsFront ? 'front' : 'back'

        const baseTarget = nearestIsFront ? FRONT_REST_Y : BACK_REST_Y
        const k = Math.round((rotation.current.y - baseTarget) / 360)
        springTarget.current = { x: REST_X, y: baseTarget + k * 360 }

        animFrame.current = requestAnimationFrame(step)
        return
      }

      animFrame.current = requestAnimationFrame(step)
    }

    stopAnimLoop()
    animFrame.current = requestAnimationFrame(step)
  }, [applyTransform, stopAnimLoop])

  const liftCard = (lifted: boolean) => {
    if (wrapperRef.current) {
      wrapperRef.current.style.transform = lifted ? `scale(${GRAB_SCALE})` : 'scale(1)'
    }
  }

  const flipCard = () => {
    stopAnimLoop()
    velocity.current = { x: 0, y: 0 }

    const targetFace = facing.current === 'front' ? 'back' : 'front'
    const baseTarget = targetFace === 'front' ? FRONT_REST_Y : BACK_REST_Y
    const k = Math.round((rotation.current.y - baseTarget) / 360)

    facing.current = targetFace
    springTarget.current = { x: REST_X, y: baseTarget + k * 360 }
    runAnimLoop()
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    stopAnimLoop()
    springTarget.current = null
    velocity.current = { x: 0, y: 0 }

    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    lastMoveTime.current = performance.now()

    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    liftCard(true)

    const now = performance.now()
    if (now - lastTapTime.current < 300) {
      flipCard()
    }
    lastTapTime.current = now
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return

    const now = performance.now()
    const dt = Math.max(1, now - lastMoveTime.current)

    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y

    const nextX = rotation.current.x - dy * DRAG_SENSITIVITY
    rotation.current.x = Math.max(-MAX_TILT_X, Math.min(MAX_TILT_X, nextX))
    rotation.current.y += dx * DRAG_SENSITIVITY

    const frameScale = 16.6 / dt
    velocity.current = {
      x: -dy * DRAG_SENSITIVITY * frameScale,
      y: dx * DRAG_SENSITIVITY * frameScale,
    }

    applyTransform()
    lastPos.current = { x: e.clientX, y: e.clientY }
    lastMoveTime.current = now
  }

  const onPointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    liftCard(false)
    runAnimLoop()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    stopAnimLoop()
    springTarget.current = null

    const STEP = 8
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        rotation.current.y -= STEP
        applyTransform()
        break
      case 'ArrowRight':
        e.preventDefault()
        rotation.current.y += STEP
        applyTransform()
        break
      case 'ArrowUp':
        e.preventDefault()
        rotation.current.x = Math.min(MAX_TILT_X, rotation.current.x + STEP)
        applyTransform()
        break
      case 'ArrowDown':
        e.preventDefault()
        rotation.current.x = Math.max(-MAX_TILT_X, rotation.current.x - STEP)
        applyTransform()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        flipCard()
        break
      default:
        break
    }
  }

  useEffect(() => {
    applyTransform()

    const hintTimeout = setTimeout(() => {
      if (isDragging.current) return

      const startTime = performance.now()

      const wiggleStep = (now: number) => {
        if (isDragging.current) return

        const elapsed = now - startTime
        const t = Math.min(1, elapsed / WIGGLE_DURATION)
        const swing = Math.sin(t * Math.PI) * easeInOutSine(t < 0.5 ? t * 2 : (1 - t) * 2)

        rotation.current = {
          x: REST_X + swing * WIGGLE_AMOUNT_X,
          y: FRONT_REST_Y + swing * WIGGLE_AMOUNT_Y,
        }
        applyTransform()

        if (t < 1) {
          wiggleFrame.current = requestAnimationFrame(wiggleStep)
        } else {
          rotation.current = { x: REST_X, y: FRONT_REST_Y }
          applyTransform()
          wiggleFrame.current = null
        }
      }

      wiggleFrame.current = requestAnimationFrame(wiggleStep)
    }, 500)

    return () => {
      clearTimeout(hintTimeout)
      if (wiggleFrame.current !== null) cancelAnimationFrame(wiggleFrame.current)
      stopAnimLoop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="card3dWrapper"
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      aria-label="Interactive tarot card. Use arrow keys to rotate, Enter to flip."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <div className="cardShadow" ref={shadowRef} />
      <div className="card3d" ref={cardRef}>
        <div className="physCardFace physCardFront">
          <div className="cardLight" ref={frontLightRef} />
          <div className="cardHolo" ref={frontHoloRef} />
          <img src={front} alt="front" draggable={false} />
        </div>
        <div className="physCardFace physCardBack">
          <div className="cardLight" ref={backLightRef} />
          <div className="cardHolo" ref={backHoloRef} />
          <img src={back} alt="back" draggable={false} />
        </div>

        <div className="cardEdge edgeTop" style={edgeColor ? { background: edgeColor } : undefined} />
        <div className="cardEdge edgeBottom" style={edgeColor ? { background: edgeColor } : undefined} />
        <div className="cardEdge edgeLeft" style={edgeColor ? { background: edgeColor } : undefined} />
        <div className="cardEdge edgeRight" style={edgeColor ? { background: edgeColor } : undefined} />
      </div>
    </div>
  )
}

export default InteractiveCard