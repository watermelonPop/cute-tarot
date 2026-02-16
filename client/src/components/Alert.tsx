// src/components/Alert.tsx
import { useEffect } from 'react'
import './Alert.css'

type AlertProps = {
  message: string
  visible: boolean
  onClose: () => void
}

export default function Alert({ message, visible, onClose }: AlertProps) {
  useEffect(() => {
    if (!visible) return

    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [visible, onClose])

  return (
    <div className={`alert ${visible ? 'show' : ''}`}>
      <span className="alert-message">{message}</span>
      <button className="alert-close" onClick={onClose}>
        &times;
      </button>
    </div>
  )
}
