import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './SpreadsPanel.css'
import type { User, Deck, Spread} from '../types'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'

interface SpreadPanelProps {
    user: User | null
    selectedDeck: Deck | null
    showAlert: (msg: string) => void
    setLoading: (loading: boolean) => void
    token: string | null
    Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
}

function SpreadPanel({user, selectedDeck, showAlert, setLoading, token, Icon }: SpreadPanelProps) {
    const [spreads, setSpreads] = useState<Spread[]>([])
    const { spreadId } = useParams()
    const navigate = useNavigate()
    const [adminEditing, setAdminEditing] = useState<boolean>(false);
    
    const [editableSpread, setEditableSpread] = useState<Spread | null>(null);
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

    useEffect(() => {
        setLoading(true);
        fetch('/api/spreads')
            .then(res => res.json())
            .then((data: Spread[]) => {
                setSpreads(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch spreads:', err);
                setLoading(false);
            });
    }, []);

    const currentSpread = spreadId ? spreads.find(c => c.id === spreadId) : null

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
            headers: { 'Content-Type': 'application/json',  'Authorization': `Bearer ${token}` },
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
                <div className='deeperPanelHeading'>
                    <button className='backBtn' onClick={() => navigate('/spreads')}>
                        Back
                    </button>
                    <h2 className='deeperPanelTitle'>{currentSpread?.name}</h2>
                    <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
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
                <div className='innerCardImgs'>
                    {Array.from({ length: currentSpread?.numPulls ?? 0 }).map((_, i) => (
                        <div className="cardImgInnerBorder">
                            <div className="cardEffectLayer">
                                <div className="cardBackOverlayWrapper">
                                    <div className="innerCardImg cardAspect"></div>
                                    <div className="cardBackTextWrapper">
                                        <Icon className="cardBackLogo"/>
                                        <div className="cardBackText">
                                            {currentSpread?.pulls[i]}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>                                    
                <div className='cardDescription'>
                    {user?.type !== "Admin" || adminEditing === false ? (
                        <>
                        <h3 className="sectionHeading">Description</h3>
                        <p className="cardParagraph">{currentSpread?.description}</p>
                        </>
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
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the ${currentSpread?.name} Spread Page!`,
                    `Each spread has a number of pulls, and a concept that aligns with each pull. Ex: For the Past, Present, Future spread, there are 3 pulls, one representing past, another representing present, and the last representing future.`,
                ]} />
            </Modal>
        </>
    )
}

export default SpreadPanel