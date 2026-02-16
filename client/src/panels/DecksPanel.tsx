import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import MiniDeck from '../components/MiniDeck'
import type { User, Deck} from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

interface DecksPanelProps {
  user: User | null
  selectedDeck: Deck | null
}

function DecksPanel({ user, selectedDeck }: DecksPanelProps) {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
    const infoModalRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        fetch('/api/decks')
            .then(res => res.json())
            .then((data: Deck[]) => {
                setDecks(data);
            })
            .catch(err => console.error('Failed to fetch decks:', err));
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
                    <h2>Decks</h2>
                </div>
                <div className='outerDeckGrid'>
                    {decks.map((deck) => (
                        <MiniDeck user={user} selectedDeck={selectedDeck} deck={deck}></MiniDeck>
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
                            Welcome to the Decks page! 
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            This page displays all deck options! Click one of the decks to see more information in the larger deck page.
                        </p>
                        {user === null ? (
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                Each deck has a back, icon, and site theme! But only logged in users can select a deck other than Rider-Waite. Log in now to select a different deck and theme.
                            </p>
                        ):(
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                Each deck has a back, icon, and site theme! You're logged in, so just click a deck, click select and see the change!
                            </p>
                        )}
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            The currently selected deck has the check mark in the top right corner!
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}

export default DecksPanel