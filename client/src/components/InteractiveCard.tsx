import { useState, useEffect, useRef } from 'react'
import './InteractiveCard.css'

interface InteractiveCardProps {
  front: string
  back: string
}

function InteractiveCard({ front, back }: InteractiveCardProps) {
    const isDragging = useRef(false)
    const lastPos = useRef({ x: 0, y: 0 })

    const [rotation, setRotation] = useState({ x: -10, y: 20 })

    const lightX = rotation.y * 0.5
        const lightY = rotation.x * 0.5 


    const onPointerDown = (e: React.PointerEvent) => {
        e.preventDefault()

        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };

        // 🔥 keeps receiving move events even if finger leaves card
        (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return

        const dx = e.clientX - lastPos.current.x
        const dy = e.clientY - lastPos.current.y

        setRotation(prev => ({
            x: prev.x - dy * 0.4,
            y: prev.y + dx * 0.4
        }))

        lastPos.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = () => {
        isDragging.current = false
    }


    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
        if (!isDragging.current) return

        const dx = e.clientX - lastPos.current.x
        const dy = e.clientY - lastPos.current.y

        setRotation(prev => ({
            x: prev.x - dy * 0.4,
            y: prev.y + dx * 0.4
        }))

        lastPos.current = { x: e.clientX, y: e.clientY }
        }

        const handleUp = () => {
        isDragging.current = false
        }

        window.addEventListener("mousemove", handleMove)
        window.addEventListener("mouseup", handleUp)

        return () => {
        window.removeEventListener("mousemove", handleMove)
        window.removeEventListener("mouseup", handleUp)
        }
    }, [])

    return (
        <div className="card3dWrapper" onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}>
        <div
            className="card3d"
            style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
            }}
        >
            <div className="physCardFace physCardFront">
                <div
                className="cardLight"
                style={{
                    background: `
                    radial-gradient(
                        circle at ${50 + lightX}% ${50 - lightY}%,
                        rgba(255,255,255,0.75),
                        rgba(0,0,0,0.45)
                    )
                    `
                }}
                />
            <img src={front} alt="front" draggable={false} />
            </div>
            <div className="physCardFace physCardBack">
                <div
                className="cardLight"
                style={{
                    background: `
                    radial-gradient(
                        circle at ${50 + lightX}% ${50 - lightY}%,
                        rgba(255,255,255,0.75),
                        rgba(0,0,0,0.45)
                    )
                    `
                }}
                />
            <img src={back} alt="back" draggable={false} />
            </div>

            <div className="cardEdge edgeTop"></div>
            <div className="cardEdge edgeBottom"></div>
            <div className="cardEdge edgeLeft"></div>
            <div className="cardEdge edgeRight"></div>
        </div>
        </div>
    )
}

export default InteractiveCard