import './MiniModal.css'
interface MiniModalProps {
    children?: React.ReactNode;
    buttons?: React.ReactNode;
    title: string;
    showModal: boolean;
    setShowModal: (show: boolean) => void;
}

export default function MiniModal({ children, buttons, title, showModal, setShowModal }: MiniModalProps) {

    if (!showModal) return null;
    return(
        <div className="mini-modal">
            <div className="mini-modal-content">
                <div className="mini-modal-header">
                    <span className="close" onClick={()=>setShowModal(false)}>&times;</span>
                    <h3 className='miniModalPrompt'>{title}</h3>
                </div>
                {children && (
                    <div className="mini-modal-body">
                        {children}
                    </div>
                )}
                {buttons && (
                    <div className="mini-modal-actions">
                        {buttons}
                    </div>
                )}
            </div>
        </div>
    )
}
