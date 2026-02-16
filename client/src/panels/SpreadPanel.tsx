import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './SpreadsPanel.css'
import type { User, Deck, Spread} from '../types'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import RiderWaiteIcon from '../assets/images/Rider-Waite/card-icon.svg?react'
import BunnyWaiteIcon from '../assets/images/Bunny-Waite/card-icon.svg?react'

interface SpreadPanelProps {
    user: User | null
    selectedDeck: Deck | null
    showAlert: (msg: string) => void
}

function SpreadPanel({user, selectedDeck, showAlert }: SpreadPanelProps) {
    const [spreads, setSpreads] = useState<Spread[]>([])
    const { spreadId } = useParams()
    const navigate = useNavigate()
    const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
    const infoModalRef = useRef<HTMLDivElement | null>(null);
    const [adminEditing, setAdminEditing] = useState<boolean>(false);
    
    const [editableSpread, setEditableSpread] = useState<Spread | null>(null);

    useEffect(() => {
        fetch('/api/spreads')
            .then(res => res.json())
            .then((data: Spread[]) => {
                setSpreads(data);
            })
            .catch(err => console.error('Failed to fetch spreads:', err));
    }, []);

    useEffect(() => {
        if(infoModalRef.current === null){
            return;
        }
        if(infoModalOpen === true){
            infoModalRef.current.style.display = "flex";
        }else if(infoModalOpen === false){
            infoModalRef.current.style.display = "none";
        }
    }, [infoModalOpen]);

    const currentSpread = spreadId ? spreads.find(c => c.id === spreadId) : null

    const SpreadIcon =
      selectedDeck?.name?.replace(/[–—]/g, "-") === "Bunny-Waite"
        ? BunnyWaiteIcon
        : RiderWaiteIcon;

    useEffect(() => {
        if (currentSpread) {
            setEditableSpread(currentSpread);
        }
    }, [currentSpread]);

    const autoResize = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = "auto";            // reset
        el.style.height = `${el.scrollHeight}px`; // grow to fit
    };

    const handleSaveEdits = async () => {
        if(user?.type !== "Admin" || adminEditing === false || !currentSpread?.id){
            showAlert("Not authorized for editing.");
            return;
        }

        try {
            const res = await fetch(`/api/spreads/${currentSpread?.id}/updateSpread`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: editableSpread?.description 
                }),
            });

            // Handle HTTP errors
            if (!res.ok) {
            const err = await res.json();
                throw new Error(err.error || 'Failed to save spread');
            }

            // Updated card returned from server
            const updatedSpread: Spread = await res.json();

            // Update local state
            setSpreads(prev =>
                prev.map(spread =>
                    spread.id === updatedSpread.id ? updatedSpread : spread
                )
            );
            setEditableSpread(updatedSpread);
            setAdminEditing(false);

        } catch (err) {
            console.error('Failed to save spread:', err);
            showAlert('Failed to save spread. Please try again.');
        }
    }
    

    return (
        <>
            <div className='panel'>
                <div className='cardHeading'>
                    <button className='deckHeadingBtn' onClick={() => navigate('/spreads')}>
                        Back
                    </button>
                    <h2 className='innerCardTitle'>{currentSpread?.name} Spread</h2>
                    <button className='infoBtn' onClick={()=>setInfoModalOpen(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    {user?.type === "Admin" && (
                        adminEditing === true ? (
                            <button className='deckHeadingBtn' onClick={()=>setAdminEditing(false)}>
                                Cancel Edit
                            </button>
                        ):(
                            <button className='deckHeadingBtn' onClick={()=>setAdminEditing(true)}>
                                Edit
                            </button>
                        )
                    )}
                </div>
                <div className='spreadCardImgs'>
                    {Array.from({ length: currentSpread?.numPulls ?? 0 }).map((_, i) => (
                        <div key={i} className="cardImgInnerBorder">
                            <SpreadIcon className="innerSpreadImg"/>
                        </div>
                    ))}
                </div>
                <div className='cardDescription'>
                    {user?.type !== "Admin" || adminEditing === false ? (
                        <p>{currentSpread?.description}</p>
                    ):(
                        <div className='cardEditInput'>
                            <label>Description: </label>
                            <textarea ref={(el) => autoResize(el)} value={editableSpread?.description} onChange={(e) => {
                                if (!editableSpread) return;

                                setEditableSpread({
                                ...editableSpread,
                                description: e.target.value,
                                });
                            }}></textarea>
                            <button className='deckHeadingBtn' onClick={()=>handleSaveEdits()}>
                                Save Edits
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="modal" ref={infoModalRef}>
                <div className="modal-content">
                    <span className="close" onClick={()=>setInfoModalOpen(false)}>&times;</span>
                    <h2 className='modalPanelTitle'>Info</h2>
                    <div className='infoModals'>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Welcome to the {currentSpread?.name} Spread Page! 
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Each spread has a number of pulls, and a concept that aligns with each pull. 
                            Ex: For the Past, Present, Future spread, there are 3 pulls, one representing past, another representing present, and the last representing future.
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SpreadPanel