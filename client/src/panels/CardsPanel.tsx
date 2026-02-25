import { useState, useEffect, useRef } from 'react'
import '../App.css'
import './panel.css'
import './CardsPanel.css'
import MiniCard from '../components/MiniCard'
import type { User, Deck, Card, Suit } from '../types'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';


interface CardsPanelProps {
  user: User | null
  selectedDeck: Deck | null
  width: number
  showAlert: (msg: string) => void
  setLoading: (loading: boolean) => void
}

function CardsPanel({ user, selectedDeck, width, showAlert, setLoading }: CardsPanelProps){
    const [cards, setCards] = useState<Card[]>([]);
    const [searchText, setSearchText] = useState<string>("");
    const [suitFilter, setSuitFilter] = useState<Suit>('Any');
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    // Load all cards
    useEffect(() => {
        setLoading(true);
        fetch('/api/cards')
        .then(res => res.json())
        .then((data: Card[]) => {
            setCards(data);
            setLoading(false);
        })
        .catch(err => {
            console.error('Failed to fetch cards:', err)
            setLoading(false);
        })
    }, [])

    useEffect(() => {
        if(modalRef.current === null){
            return;
        }
        if(modalOpen === true){
            modalRef.current.style.display = "flex";
        }else if(modalOpen === false){
            modalRef.current.style.display = "none";
        }
    }, [modalOpen]);

    const handleSearch = () => {
        if (searchText.trim() === "" && suitFilter === "Any") {
            showAlert("Enter text or select a suit before searching.");
            return;
        }

        let path = '/cards/search';

        // Both text and suit selected
        if (searchText.trim() && suitFilter !== 'Any') {
            path += `/${encodeURIComponent(searchText.trim())}/${encodeURIComponent(suitFilter)}`;
        }
        // Only text
        else if (searchText.trim()) {
            path += `/${encodeURIComponent(searchText.trim())}/Any`;
        }
        // Only suit
        else if (suitFilter !== 'Any') {
            path += `/any/${encodeURIComponent(suitFilter)}`;
        }

        navigate(path);
    }

    // Desired display order
    const suitOrder: Suit[] = [
    'Major Arcana',
    'Wands',
    'Cups',
    'Coins',
    'Swords',
    ];

    // Group + sort cards
    const groupedCards = suitOrder.map((suit) => {
        const suitCards = cards
            .filter((card) => card.type === suit)
            .sort((a, b) => a.value - b.value); // numeric sort

        return {
            suit,
            cards: suitCards,
        };
    });



    return (
        <>
            <div className='panel'>
                <div className='panelTitle'>
                    <button className='infoBtn' onClick={()=>setModalOpen(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    <h2>{selectedDeck?.name} Cards</h2>
                </div>
                <div className='cardsSearchDiv'>
                    <div className='cardsTextSearchDiv'>
                        <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                        <button onClick={() => handleSearch()}>search</button>
                    </div>
                    <div className='cardsSelectSearchDiv'>
                        <label>Suit: </label>
                        <select value={suitFilter} onChange={(e) => {
                            if (['Any', 'Major Arcana', 'Swords', 'Cups', 'Wands', 'Coins'].includes(e.target.value as Suit)) {
                                setSuitFilter(e.target.value as Suit);
                            }
                        }}>
                            <option>Any</option>
                            <option>Major Arcana</option>
                            <option>Swords</option>
                            <option>Cups</option>
                            <option>Wands</option>
                            <option>Coins</option>
                        </select>
                    </div>
                </div>
                {groupedCards.map((group) =>
                    group.cards.length > 0 ? (
                        <div key={group.suit} className='outerCardSuit'>
                        <h3 className="suitHeading">{group.suit}</h3>

                        <div className="outerCardsGrid">
                            {group.cards.map((card) => (
                            <MiniCard
                                key={card.id}
                                user={user}
                                selectedDeck={selectedDeck}
                                card={card}
                                width={width}
                            />
                            ))}
                        </div>
                        </div>
                    ) : null
                )}
            </div>

            <div className="modal" ref={modalRef}>
                <div className="modal-content">
                    <span className="close" onClick={()=>setModalOpen(false)}>&times;</span>
                    <h2 className='modalPanelTitle'>Info</h2>
                    <div className='infoModals'>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Welcome to the Cards page! 
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Remember that tarot cards are a guide and not a strict directive or fortune teller! 
                        </p>
                        {user !== null ? (
                            <>
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                This page displays all tarot cards in the selected deck by suit, sorted by value. 
                                The default selected deck is the Rider-Waite Deck. You are logged in, go to the decks page to select a different deck!
                            </p> 
                            </>
                        ):(
                            <>
                            <p className='infoModalPt'>
                                <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                                This page displays all tarot cards in the selected deck by suit, sorted by value. 
                                The default selected deck is the Rider-Waite Deck. Go to the decks page to select and browse using a different deck. You're logged out, so this selection only lasts until you refresh!
                            </p> 
                            </>
                        )}
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Hovering over a card will show the upright and reversed keywords for the card.  
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Clicking on a card will take you to see more information in the card's larger page.
                        </p>
                        <p className='infoModalPt'>
                            <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                            Type something into the search bar and/or set a specific suit filter, then click search to see the results!
                            The text will be searched in all the card's information including title, description, and the different meanings. 
                            The suit filter narrows results to a specific suit. 
                            The text search and filter can be used independently or together for an advanced search. 
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}


export default CardsPanel