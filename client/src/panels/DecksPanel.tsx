import { useState, useEffect } from 'react'
import '../App.css'
import './panel.css'
import MiniDeck from '../components/MiniDeck'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'
import type { User, Deck} from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

interface DecksPanelProps {
  user: User | null
  selectedDeck: Deck | null
  setUserSelectedDeck: (deckId: string) => void
  setLoading: (loading: boolean) => void
}

function DecksPanel({ user, selectedDeck, setLoading, setUserSelectedDeck }: DecksPanelProps) {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

    useEffect(() => {
        setLoading(true);
        fetch('/api/decks')
            .then(res => res.json())
            .then((data: Deck[]) => {
                setDecks(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch decks:', err);
                setLoading(false);
            });
    }, []);

    return (
        <>
            <div className='panel'>
                <div className='panelTitle'>
                    <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    <h2>Decks</h2>
                    <span className='infoBtn' style={{backgroundColor: "transparent"}}></span>
                </div>
                <div className='outerDeckGrid'>
                    {decks.map((deck) => (
                        <MiniDeck user={user} selectedDeck={selectedDeck} deck={deck} setUserSelectedDeck={setUserSelectedDeck}></MiniDeck>
                    ))}
                </div>
            </div>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Decks page!`,
                    `This page displays all deck options! Click one of the decks to see more information in the larger deck page.`,
                    user === null ? `Each deck has a back, icon, and site theme! Anyone can select a different deck and browse the page using it. But only logged in users can save this selection. You're not logged in, so your selection will disappear after refresh!` : `Each deck has a back, icon, and site theme! You're logged in, so just click a deck, click select and see the change! The selection will be automatically applied to your account.`,
                    `The currently selected deck has the check mark in the top right corner!`,
                    `I'll be adding to these decks as I collect them in real life!`
                ]} />
            </Modal>
        </>
    )
}

export default DecksPanel