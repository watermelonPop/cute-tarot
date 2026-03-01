import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './AccountPanel.css'
import type { User, Deck, Card, Reading, Spread } from '../types'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faTrash } from '@fortawesome/free-solid-svg-icons';

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
    setLoading: (loading: boolean) => void
    token: string | null
    showAlert: (msg: string) => void
}
function AccountPanel({ user, selectedDeck, login, handleLogout, setLoading, token, showAlert }: AccountProps) {
    const [cards, setCards] = useState<Card[]>([]);
    const [readings, setReadings] = useState<Reading[]>([]);
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const navigate = useNavigate();
    const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
    const infoModalRef = useRef<HTMLDivElement | null>(null);
    const [editingReadings, setEditingReadings] = useState<boolean>(false);
     // Load all user readings
    useEffect(() => {
        if (!user || !token) return;

        setLoading(true);

        const loadReadings = async () => {
            try {
            // 1️⃣ Fetch reading IDs (JWT protected)
            const res = await fetch(`/api/readings`, {
                headers: {
                'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error('Failed to fetch reading IDs');

            const readingIds: string[] = await res.json();

            // 2️⃣ Fetch each reading by ID (also JWT protected)
            const readingPromises = readingIds.map(id =>
                fetch(`/api/readings/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                }).then(r => {
                if (!r.ok) throw new Error(`Failed to fetch reading ${id}`);
                return r.json();
                })
            );

            const fullReadings = await Promise.all(readingPromises);
            setReadings(fullReadings);

            // 3️⃣ Public routes (no JWT needed)
            const cardsRes = await fetch('/api/cards');
            const cardsData: Card[] = await cardsRes.json();
            setCards(cardsData);

            const spreadsRes = await fetch('/api/spreads');
            const spreadsData: Spread[] = await spreadsRes.json();
            setSpreads(spreadsData);

            setLoading(false);

            } catch (err) {
            console.error('Failed to load readings:', err);
            setLoading(false);
            }
        };

        loadReadings();
        }, [user, token]);

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

    const deleteReading = async (readingId: string) => {
        if (!readingId || !token || !user) {
            showAlert('Authentication error');
            return;
        }
        try {
            const res = await fetch(`/api/readings/${readingId}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    userId: user.id
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete reading.');
            }

            setReadings(readings.filter(reading => reading.id !== readingId));
            showAlert('Reading Deleted!');
        } catch (err) {
            console.error('Failed to delete reading:', err);
            showAlert('Failed to delete reading. Please try again.');
        }
    };



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
                    {editingReadings === false ? (
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
                            <button className='editReadingsBtn' onClick={()=>setEditingReadings(true)}>Edit Readings</button>
                        </>
                    ):(
                        <>
                        <h2 className='accountReadingsTitle'>Editing Past Readings</h2>
                        <div className='userReadingsGrid'>
                            {readings.map((reading) => (
                                <div
                                key={reading.id}
                                className='userReading'
                                style={{ cursor: "default" }}
                                >
                                <button
                                    className="readingActionBtn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("Action clicked for:", reading.id);
                                        deleteReading(reading.id);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faTrash}></FontAwesomeIcon>
                                </button>

                                <div className="spreadImgOuter">
                                    {reading.cards.map((cardId, idx) => {
                                    const card = cards.find(c => c.id === cardId);
                                    if (!card) return null;

                                    return (
                                        <div key={cardId} className="spreadImgBorder">
                                        <img
                                            src={`${selectedDeck?.images['card-front']}/${card.type.replaceAll(" ", "")}/${card.nameShort}.png`}
                                            className={
                                            reading.reversalValues[idx]
                                                ? "spreadImg upside-down"
                                                : "spreadImg"
                                            }
                                            alt={`Deck card ${card.name}`}
                                        />
                                        </div>
                                    );
                                    })}
                                </div>

                                <h3 className='userReadingTitle'>{reading.name}</h3>
                                <p>{formatDate(reading.date)}</p>

                                {reading.reversals && <p>Reversals allowed.</p>}

                                <p>
                                    {spreads.find(s => s.id === reading.spread)?.name}:{" "}
                                    {reading.cards.length} Cards
                                </p>

                                <p>{reading.topic}</p>
                                </div>
                            ))}
                        </div>

                        <button
                            className='editReadingsBtn'
                            onClick={() => setEditingReadings(false)}
                            >
                            Done
                        </button>
                    </>
                    )}
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
                                <p className='infoModalPt'>
                                    <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                    Click the Edit Reading button to delete any unwanted readings! Think twice, this is not reversable.
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