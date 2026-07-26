import './ConfirmModal.css'
interface ConfirmModalProps {
    prompt?: string;
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    onConfirm?: () => void;
}

export default function ConfirmModal({ prompt, showModal, setShowModal, onConfirm }: ConfirmModalProps) {

    if (!showModal) return null;

    return (
        <div className="confirm-modal">
            <div className="confirm-modal-content">
                <div className="confirm-modal-header">
                    <h2 className='confirmModalPrompt'>{prompt}</h2>
                </div>
                <div className="confirm-modal-actions">
                    <button className="confirm-modal-btn confirm-modal-cancel" onClick={()=>setShowModal(false)}>Cancel</button>
                    <button className="confirm-modal-btn confirm-modal-confirm" onClick={onConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    )
}