import './ConfirmModal.css'
import MiniModal from './MiniModal'

interface ConfirmModalProps {
    prompt: string;
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    onConfirm?: () => void;
}

export default function ConfirmModal({ prompt, showModal, setShowModal, onConfirm }: ConfirmModalProps) {

    if (!showModal) return null;

    return(
        <MiniModal title={"Delete Reading"} showModal={showModal} setShowModal={setShowModal} buttons={
            <>
                <button className="confirm-modal-btn confirm-modal-cancel" onClick={()=>setShowModal(false)}>Cancel</button>
                <button className="confirm-modal-btn confirm-modal-confirm" onClick={onConfirm}>Confirm</button>
            </>
        } >
            <p className="confirm-modal-prompt">{prompt}</p>
        </MiniModal>
    )
}