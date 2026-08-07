import { useState } from 'react'
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
  decks: Deck[]
  setUserSelectedDeck: (deckId: string) => void
}

function DecksPanel({ user, selectedDeck, decks, setUserSelectedDeck }: DecksPanelProps) {
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

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
                    `Each deck has its own back design, icon, and site theme. Click a deck to open its full page, or click the checkmark button in a deck's top-right corner to select it directly from this grid.`,
                    user === null
                        ? `Anyone can select a deck and browse the site with it, but only logged in users can save that selection. You're not logged in, so it'll reset on refresh.`
                        : `You're logged in, so any deck you select will be saved automatically to your account.`,
                    `The currently selected deck is marked with a checkmark in its top-right corner.`,
                    `I'll keep adding more decks as I collect them in real life!`
                ]} />
            </Modal>
        </>
    )
}

export default DecksPanel