import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBan } from '@fortawesome/free-solid-svg-icons'
import { HIGHLIGHT_COLORS } from '../lib/annotation/colors'
import './HighlightColorModal.css'
import MiniModal from './MiniModal'

interface HighlightColorModalProps {
    showModal: boolean
    setShowModal: (show: boolean) => void
    activeColor?: string
    noHighlightDisabled: boolean
    onSelectColor: (color?: string) => void
}

export default function HighlightColorModal({
    showModal,
    setShowModal,
    activeColor,
    noHighlightDisabled,
    onSelectColor,
}: HighlightColorModalProps) {
    if (!showModal) return null

    const choose = (color?: string) => {
        onSelectColor(color)
        setShowModal(false)
    }

    // Ported to document.body: AnnotationToolbar (this component's usual
    // parent) is positioned via an inline `transform`, which makes it the
    // containing block for any `position: fixed` descendant — without a
    // portal this modal would center/size itself against the toolbar's tiny
    // floating box instead of the actual viewport.
    return createPortal(
        <>
        <MiniModal title={"Select Highlight Color"} showModal={showModal} setShowModal={setShowModal} buttons={
            <>
                <button className="highlight-color-modal-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </>
        } >
            <div className="highlight-color-modal-swatches">
                <button
                    className={`annotationSwatchBtn annotationSwatchNone${!activeColor ? ' active' : ''}`}
                    title={noHighlightDisabled ? 'A note requires a highlight color' : 'No highlight'}
                    disabled={noHighlightDisabled}
                    onClick={() => choose(undefined)}
                >
                    <FontAwesomeIcon icon={faBan} />
                </button>
                {HIGHLIGHT_COLORS.map(({ label, value }) => (
                    <button
                        key={value}
                        className={`annotationSwatchBtn${activeColor === value ? ' active' : ''}`}
                        style={{ backgroundColor: value }}
                        title={label}
                        onClick={() => choose(value)}
                    />
                ))}
            </div>
        </MiniModal>
        </>
        ,
        document.body
    )
}
