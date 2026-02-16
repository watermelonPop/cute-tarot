import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './SpreadsPanel.css'
import MiniSpread from '../components/MiniSpread'
import type { User, Deck, Spread} from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

interface SpreadsPanelProps {
    user: User | null
    selectedDeck: Deck | null;
}

function SpreadsPanel({ user, selectedDeck }: SpreadsPanelProps) {
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
    const infoModalRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        fetch('/api/spreads')
        .then(res => res.json())
        .then(data => 
            {console.log(data);
            setSpreads(data);}
        )
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

    return (
        <>
            <div className='panel'>
                <div className='panelTitle'>
                    <button className='infoBtn' onClick={()=>setInfoModalOpen(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    <h2>Spreads</h2>
                </div>
                <div className='outerSpreadsGrid'>
                    {spreads.map((spread) => (
                        <MiniSpread user={user} selectedDeck={selectedDeck} spread={spread}></MiniSpread>
                    ))}
                </div>
            </div>
            <div className="modal" ref={infoModalRef}>
                <div className="modal-content">
                    <span className="close" onClick={()=>setInfoModalOpen(false)}>&times;</span>
                    <h2 className='modalPanelTitle'>Info</h2>
                    <div className='infoModals'>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Welcome to the Spreads Page! 
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            These are the tarot reading spreads available in the readings page. Each spread has a number of pulls, and a concept that aligns with each pull. 
                            Ex: For the Past, Present, Future spread, there are 3 pulls, one representing past, another representing present, and the last representing future.
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Click on a spread to see more information in the larger Spread page.
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SpreadsPanel