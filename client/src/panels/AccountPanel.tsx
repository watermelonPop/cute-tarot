import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './AccountPanel.css'
import type { User, Deck, Card, Reading, Spread } from '../types'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface AccountProps {
  user: User | null
  setUser: (user: User | null) => void
  login: () => void
  handleLogout: () => void
  selectedDeck: Deck | null
}
function AccountPanel({ user, selectedDeck, login, handleLogout }: AccountProps) {
    const [cards, setCards] = useState<Card[]>([]);
    const [readings, setReadings] = useState<Reading[]>([]);
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const navigate = useNavigate();
    const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
    const infoModalRef = useRef<HTMLDivElement | null>(null);
     // Load all user readings
    useEffect(() => {
        if (!user) return;

        const loadReadings = async () => {
            try {
                // 1️⃣ Fetch reading IDs
                const res = await fetch(`/api/readings/user/${user.id}`);
                if (!res.ok) throw new Error('Failed to fetch reading IDs');

                const readingIds: string[] = await res.json();

                // 2️⃣ Fetch each reading by ID
                const readingPromises = readingIds.map(id =>
                    fetch(`/api/readings/${id}`).then(r => {
                        if (!r.ok) throw new Error(`Failed to fetch reading ${id}`);
                        return r.json();
                    })
                );

                // 3️⃣ Resolve all readings
                const fullReadings = await Promise.all(readingPromises);

                setReadings(fullReadings);
            } catch (err) {
                console.error('Failed to load readings:', err);
            }
        };

        loadReadings();
    }, [user]);

    // Load all cards
    useEffect(() => {
        fetch('/api/cards')
        .then(res => res.json())
        .then((data: Card[]) => setCards(data))
        .catch(err => console.error('Failed to fetch cards:', err))
    }, [])

    // Load all spreads
    useEffect(() => {
        fetch('/api/spreads')
        .then(res => res.json())
        .then((data: Spread[]) => setSpreads(data))
        .catch(err => console.error('Failed to fetch cards:', err))
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
                    <h2>Account</h2>
                </div>
                {user ? (
                        <div className="userArea">
                            <img src={user.picture} className="avatar" alt={user.name ?? 'User avatar'} referrerPolicy="no-referrer"/>
                            <div className='userInfo'>
                                {user.type === "Admin" && (
                                    <p>{user.type}</p>
                                )}
                                <p>{user.name}</p>
                                <p>{user.email}</p>
                            </div>
                            <button className="accountLoginBtn" onClick={handleLogout}>
                            Log out
                            </button>
                        </div>
                    ) : (
                        <div className="userArea">
                            <p>Log in to save readings and choose an alternate site deck & theme.</p>
                            <button className="accountLoginBtn" onClick={() => login()}>
                                Log in with Google
                            </button>
                        </div>
                    )
                }
                {readings.length > 0 && user !== null && (
                    <>
                    <h2 className='accountReadingsTitle'>Past Readings</h2>
                    <div className='userReadingsGrid'>
                        {readings.map((reading) => (
                            <>
                                <div className='userReading' onClick={() => navigate(`/readings/${reading.id}`)}>
                                    <div className="spreadImgOuter">
                                        {reading.cards.map((cardId, idx) => {
                                            const card = cards.find(c => c.id === cardId);

                                            if (!card) return null;

                                            return (
                                            <div key={cardId} className="spreadImgBorder">
                                                <img
                                                src={`${selectedDeck?.images['card-front']}/${card.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                                                className={reading.reversalValues[idx] === true ? "spreadImg upside-down" : "spreadImg"}
                                                alt={`Deck card ${card.name}`}
                                                />
                                            </div>
                                            );
                                        })}
                                        </div>
                                    <h3 className='userReadingTitle'>{reading.name}</h3>
                                    <p>{formatDate(reading.date)}</p>
                                    {reading.reversals === true && (
                                        <p>Reversals allowed.</p>
                                    )}
                                    <p>
                                        {spreads.find(s => s.id === reading.spread)?.name}: {reading.cards.length} Cards
                                    </p>
                                    <p>{reading.topic}</p>
                                </div>
                            </>
                        ))}
                    </div>
                    </>
                )}
            </div>
            <div className="modal" ref={infoModalRef}>
                <div className="modal-content">
                    <span className="close" onClick={()=>setInfoModalOpen(false)}>&times;</span>
                    <h2 className='modalPanelTitle'>Info</h2>
                    <div className='infoModals'>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Welcome to the Account Page! 
                        </p>
                        {user !== null ? (
                            <>
                                <p className='infoModalPt'>
                                    <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                    You are logged in! This is where all your account information lives!
                                </p>
                                <p className='infoModalPt'>
                                    <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                    Your history of readings will also be displayed here. Click on a reading to go to see more information in the larger Reading page. 
                                </p>
                                <p className='infoModalPt'>
                                    <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                    You can also add notes in the larger Reading page to keep your thoughts
                                </p>
                            </>
                        ):(
                            <>
                                <p className='infoModalPt'>
                                    <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                    You are not logged in! Log in to use this page!
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default AccountPanel