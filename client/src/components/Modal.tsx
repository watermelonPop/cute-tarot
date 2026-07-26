import './Modal.css'
interface ModalProps {
    children: React.ReactNode;
    title?: string;
    showModal: boolean;
    setShowModal: (show: boolean) => void;
}

export default function Modal({ children, title, showModal, setShowModal }: ModalProps) {

    if (!showModal) return null;

    return (
        <div className="modal">
            <div className="modal-content">
                <div className="modal-header">
                    <span className="close" onClick={()=>setShowModal(false)}>&times;</span>
                    <h2 className='modalPanelTitle'>{title}</h2>
                    <span className="close"></span>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    )
}
