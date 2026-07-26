import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import '../App.css'
import './panel.css'
import './CardsPanel.css'
import MiniCard from '../components/MiniCard'
import type { User, Deck, Card, Suit } from '../types'
import { isValidSuit, ALL_SUITS } from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import SparkleCheckbox from '../components/SparkleCheckbox'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'

interface CardsPanelProps {
  user: User | null
  selectedDeck: Deck | null
  showAlert: (msg: string) => void
  setLoading: (loading: boolean) => void
}

function CardsPanel({ user, selectedDeck, setLoading }: CardsPanelProps){
    const [cards, setCards] = useState<Card[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse initial state directly from the URL so refresh restores it
    const initialSearchText = searchParams.get('q') ?? '';
    const initialSuits = (searchParams.get('suits') ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(isValidSuit);

    const [searchText, setSearchText] = useState<string>(initialSearchText);
    const [suitFilters, setSuitFilters] = useState<Exclude<Suit, 'Any'>[]>(initialSuits); // empty = "Any"
    const [suitDropdownOpen, setSuitDropdownOpen] = useState<boolean>(false);
    const suitDropdownRef = useRef<HTMLDivElement | null>(null);
    const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
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

    // Close the suit dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suitDropdownRef.current && !suitDropdownRef.current.contains(e.target as Node)) {
                setSuitDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keep the URL in sync whenever search text or suit filters change
    useEffect(() => {
        const params = new URLSearchParams();

        if (searchText.trim() !== '') {
            params.set('q', searchText.trim());
        }

        if (suitFilters.length > 0) {
            params.set('suits', suitFilters.join(','));
        }

        setSearchParams(params, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText, suitFilters]);

    const isAnySelected = suitFilters.length === 0;

    const toggleAny = () => {
        setSuitFilters([]); // clearing = "Any"
    };

    const toggleSuit = (suit: Exclude<Suit, 'Any'>) => {
        setSuitFilters((prev) => {
            const isCurrentlySelected = prev.includes(suit);
            let next: Exclude<Suit, 'Any'>[];

            if (isCurrentlySelected) {
                next = prev.filter((s) => s !== suit);
            } else {
                next = [...prev, suit];
            }

            // If every individual suit ends up checked, collapse back to "Any" (empty array)
            if (next.length === ALL_SUITS.length) {
                return [];
            }

            return next;
        });
    };

    const clearSearch = () => {
        setSearchText('');
    };

    const suitSummaryLabel = isAnySelected
        ? "Any"
        : suitFilters.length === 1
            ? suitFilters[0]
            : `${suitFilters.length} suits`;

    // Desired display order
    const suitOrder: Suit[] = [
    'Major Arcana',
    'Wands',
    'Cups',
    'Coins',
    'Swords',
    ];

    const normalizedSearch = searchText.trim().toLowerCase();

    const matchesSearch = (card: Card) => {
        if (normalizedSearch === "") return true;

        const searchableFields = [
            card.name,
            card.keywordsUp,
            card.keywordsRev,
            card.meaningUp,
            card.meaningRev,
            card.meaningAdvice,
            card.meaningLove,
            card.meaningCareer,
            card.meaningYesNo,
        ];

        return searchableFields.some((field) =>
            field?.toLowerCase().includes(normalizedSearch)
        );
    };

    // Group + filter + sort cards — recomputed only when inputs actually change
    const groupedCards = useMemo(() => {
        return suitOrder.map((suit) => {
            if (!isAnySelected && !suitFilters.includes(suit as Exclude<Suit, 'Any'>)) {
                return { suit, cards: [] };
            }

            const suitCards = cards
                .filter((card) => card.type === suit)
                .filter(matchesSearch)
                .sort((a, b) => a.value - b.value);

            return { suit, cards: suitCards };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards, suitFilters, isAnySelected, normalizedSearch]);

    const hasAnyResults = groupedCards.some((group) => group.cards.length > 0);

    return (
        <>
            <div className='panel'>
                <div className='panelTitle'>
                    <button className='infoBtn' onClick={()=>setShowInfoModal(true)}><FontAwesomeIcon icon={faCircleInfo}></FontAwesomeIcon></button>
                    <h2>{selectedDeck?.name} Cards</h2>
                    <span className='infoBtn' style={{backgroundColor: "transparent"}}></span>
                </div>
                <div className='cardsSearchDiv'>
                    <div className='cardsTextSearchDiv'>
                        <div className="searchInputWrapper">
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Search cards..."
                            />
                            {searchText !== '' && (
                                <button
                                    type="button"
                                    className="clearSearchBtn"
                                    onClick={clearSearch}
                                    aria-label="Clear search"
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className='cardsSelectSearchDiv' ref={suitDropdownRef}>
                        <label>Suit: </label>
                        <button
                            type="button"
                            className="suitDropdownToggle"
                            onClick={() => setSuitDropdownOpen((open) => !open)}
                        >
                            <span>{suitSummaryLabel}</span>
                            <FontAwesomeIcon icon={faChevronDown} className={suitDropdownOpen ? 'chevronOpen' : ''} />
                        </button>

                        {suitDropdownOpen && (
                            <div className="suitDropdownMenu">
                                <label className="suitDropdownOption">
                                    <SparkleCheckbox checked={isAnySelected} onChange={toggleAny} unCheckedStyle={{backgroundColor: selectedDeck?.style["accent-background"], borderColor: selectedDeck?.style["accent-text"]}} checkedStyle={{backgroundColor: selectedDeck?.style["secondary-background"], borderColor: selectedDeck?.style["secondary-text"], color: selectedDeck?.style["accent-background"]}} />
                                    Any
                                </label>
                                {ALL_SUITS.map((suit) => (
                                    <label key={suit} className="suitDropdownOption">
                                        <SparkleCheckbox checked={isAnySelected || suitFilters.includes(suit)} onChange={() => toggleSuit(suit)} unCheckedStyle={{backgroundColor: selectedDeck?.style["accent-background"], borderColor: selectedDeck?.style["accent-text"]}} checkedStyle={{backgroundColor: selectedDeck?.style["secondary-background"], borderColor: selectedDeck?.style["secondary-text"], color: selectedDeck?.style["accent-background"]}} />
                                        {suit}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {!hasAnyResults && (
                    <p className="noResultsText">No cards match your search.</p>
                )}

                {groupedCards
                    // 1. Filter out empty suits first so they never reach the DOM
                    .filter((group) => group.cards.length > 0)
                    // 2. Map through only the visible suits, tracking the clean index
                    .map((group, index) => (
                        <div key={group.suit} className="outerCardSuit">
                        {/* 3. Apply an inline style reset ONLY to the first visible element */}
                        <h3 
                            className="suitHeading"
                            style={index === 0 ? { borderTop: 'none', paddingTop: 0 } : {}}
                        >
                            {group.suit}
                        </h3>

                        <div className="outerCardsGrid">
                            {group.cards.map((card) => (
                            <MiniCard
                                key={card.id}
                                user={user}
                                selectedDeck={selectedDeck}
                                card={card}
                            />
                            ))}
                        </div>
                        </div>
                    ))}
            </div>
            <Modal title="Info" showModal={showInfoModal} setShowModal={setShowInfoModal}>
                <InfoPage infoMessages={[
                    `Welcome to the Cards page!`,
                    `Remember that tarot cards are a guide and not a strict directive or fortune teller!`,
                    user !== null
                        ? `This page displays all tarot cards in the selected deck by suit, sorted by value. The default selected deck is the Rider-Waite Deck. You are logged in, go to the decks page to select a different deck!`
                        : `This page displays all tarot cards in the selected deck by suit, sorted by value. The default selected deck is the Rider-Waite Deck. Go to the decks page to select and browse using a different deck. You're logged out, so this selection only lasts until you refresh!`,
                    `Hovering over a card will show the upright and reversed keywords for the card.`,
                    `Clicking on a card will take you to see more information in the card's larger page.`,
                    `Type something into the search bar and/or set a specific suit filter to see filtered results! The text will be searched in all the card's information including title, description, and the different meanings. The suit filter narrows results to a specific suit. The text search and filter can be used independently or together for an advanced search.`
                ]} />
            </Modal>
        </>
    )
}


export default CardsPanel