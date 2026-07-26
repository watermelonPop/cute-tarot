import { useState, useEffect, useRef } from 'react';
import '../App.css';
import './panel.css';
import './CardsPanel.css';
import MiniCard from '../components/MiniCard';
import type { User, Deck, Card, Suit } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

interface SearchCardsPanelProps {
  user: User | null;
  selectedDeck: Deck | null;
  showAlert: (msg: string) => void
  setLoading: (loading: boolean) => void
}

const VALID_SUITS: Suit[] = [
  'Any',
  'Major Arcana',
  'Swords',
  'Cups',
  'Wands',
  'Coins',
];

function SearchCardsPanel({ user, selectedDeck, showAlert, setLoading }: SearchCardsPanelProps) {
  const [resultCards, setResultCards] = useState<Card[]>([]);
  const navigate = useNavigate();
  const params = useParams();

  const searchText = params.searchText === "any" ? "" : params.searchText ?? '';
    const suitFilter = VALID_SUITS.includes(params.suitFilter as Suit)
    ? (params.suitFilter as Suit)
    : 'Any';



  // 🔹 Local editable state
  const [inputSearchText, setInputSearchText] = useState(searchText);
  const [inputSuitFilter, setInputSuitFilter] = useState<Suit>(suitFilter);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
    const modalRef = useRef<HTMLDivElement | null>(null);

  // Sync local state when URL changes (back/forward nav)
  useEffect(() => {
    setInputSearchText(searchText);
    setInputSuitFilter(suitFilter);
  }, [searchText, suitFilter]);

  useEffect(() => {
    setLoading(true);
    const fetchCards = async () => {
      let cards: Card[] = [];

      if (searchText) {
        const res = await fetch(`/api/cards/search?query=${searchText}`);
        cards = await res.json();
      } else {
        const res = await fetch('/api/cards');
        cards = await res.json();
      }

      if (suitFilter !== 'Any') {
        cards = cards.filter(c => c.type === suitFilter);
      }

      setResultCards(cards);
      setLoading(false);
    };

    fetchCards().catch(err => {
      console.error('Failed to fetch cards:', err);
      setLoading(false);
    });
  }, [searchText, suitFilter]);

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
        if (inputSearchText.trim() === "" && inputSuitFilter === "Any") {
            showAlert("Enter text or select a suit before searching.");
            return;
        }

        let path = '/cards/search';

        // Both text and suit selected
        if (inputSearchText.trim() && inputSuitFilter !== 'Any') {
            path += `/${encodeURIComponent(inputSearchText.trim())}/${encodeURIComponent(inputSuitFilter)}`;
        }
        // Only text
        else if (inputSearchText.trim()) {
            path += `/${encodeURIComponent(inputSearchText.trim())}`;
        }
        // Only suit
        else if (inputSuitFilter !== 'Any') {
            path += `/any/${encodeURIComponent(inputSuitFilter)}`; // use "any" as placeholder
        }

        navigate(path);
    };



  return (
    <>
    <div className="panel">
        <div className='panelTitle'>
            <button className='infoBtn' onClick={()=>setModalOpen(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
            <h2>{selectedDeck?.name} Cards</h2>
        </div>

      <div className="cardsSearchDiv">
        <div className="cardsTextSearchDiv">
          <input
            type="text"
            value={inputSearchText}
            onChange={(e) => setInputSearchText(e.target.value)}
          />
          <button
            onClick={handleSearch}
          >
            Search
          </button>
        </div>

        <div className="cardsSelectSearchDiv">
          <select
            value={inputSuitFilter}
            onChange={(e) => setInputSuitFilter(e.target.value as Suit)}
          >
            {VALID_SUITS.map(suit => (
              <option key={suit} value={suit}>
                {suit}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="outerCardsGrid">
        {resultCards.map(card => (
          <MiniCard
            key={card.id}
            user={user}
            selectedDeck={selectedDeck}
            card={card}
          />
        ))}
      </div>
    </div>
    <div className="modal" ref={modalRef}>
        <div className="modal-content">
            <span className="close" onClick={()=>setModalOpen(false)}>&times;</span>
            <h2 className='modalPanelTitle'>Info</h2>
            <div className='infoModals'>
                <p className='infoModalPt'>
                    <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                    Welcome to the Card Search page! 
                </p>
                {user !== null ? (
                    <>
                    <p className='infoModalPt'>
                        <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                        This page displays tarot cards that match your search text and suit filter. 
                        The default selected deck is the Rider-Waite Deck. You are logged in, go to the decks page to select a different deck!
                    </p> 
                    </>
                ):(
                    <>
                    <p className='infoModalPt'>
                        <FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon>
                        This page displays tarot cards that match your search text and suit filter.
                        You are not logged in, so the selected deck will be the Rider-Waite Deck. Log in to select a different deck.
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
  );
}

export default SearchCardsPanel;
