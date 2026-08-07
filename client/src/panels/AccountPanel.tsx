import { useState, useEffect } from 'react'
import '../App.css'
import './panel.css'
import './AccountPanel.css'
import '../components/MiniDeck.css'
import type { User, Deck, Card, Reading, Spread } from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import MiniReading from '../components/MiniReading'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'

interface AccountProps {
    user: User | null
    setUser: (user: User | null) => void
    login: () => void
    handleLogout: () => void
    token: string | null
    cards: Card[]
    decks: Deck[]
    showAlert: (msg: string) => void
    setLoading: (loading: boolean) => void
    isMobile: () => boolean
}
function AccountPanel({ user, login, handleLogout, setLoading, token, cards, decks, showAlert, isMobile }: AccountProps) {
    const [readings, setReadings] = useState<Reading[]>([]);
    const [spreads, setSpreads] = useState<Spread[]>([]);
    const [editingReadings, setEditingReadings] = useState<boolean>(false);
        const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
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

            // Public route (no JWT needed) — cards/decks come from App-level state.
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
                    <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
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
                            {!isMobile() && (
                                <button className="accountLoginBtn" onClick={handleLogout}>
                                    Log out
                                </button>
                            )}
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
                            <h3 className='suitHeading'>Past Readings</h3>
                            <div className='outerDeckGrid'>
                                {readings.map((reading) => (
                                    <>
                                        <MiniReading deck={decks.find(d => d.id === reading.deckId) ?? null} reading={reading} cards={cards} spreads={spreads} editingReadings={false}></MiniReading>
                                    </>
                                ))}
                            </div>
                            <button className='mainBtn' onClick={()=>setEditingReadings(true)}>Edit Readings</button>
                        </>
                    ):(
                        <>
                        <h3 className='suitHeading'>Editing Past Readings</h3>
                        <div className='outerDeckGrid'>
                            {readings.map((reading) => (
                                <>
                                    <MiniReading deck={decks.find(d => d.id === reading.deckId) ?? null} reading={reading} cards={cards} spreads={spreads} editingReadings={true} onDeleteReading={deleteReading}></MiniReading>
                                </>
                            ))}
                        </div>
                        <button
                            className='mainBtn'
                            onClick={() => setEditingReadings(false)}
                            >
                            Done
                        </button>
                    </>
                    )}
                    </>
                )}
            </div>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Account Page!`,
                    `You are logged in! This is where all your account information lives!`,
                    `Your history of readings will also be displayed here. Click on a reading to go to see more information in the larger Reading page.`,
                    `You can also add notes in the larger Reading page to keep your thoughts.`,
                    `Click the Edit Reading button to delete any unwanted readings! Think twice, this is not reversable.`
                ]} />
            </Modal>
        </>
    )
}

export default AccountPanel