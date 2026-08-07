import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import '../App.css'
import './panel.css'
import './CardsPanel.css'
import MiniCard from '../components/MiniCard'
import type { User, Deck, Card, Suit } from '../types'
import { isValidSuit, ALL_SUITS, getDeckTheme } from '../types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import SparkleCheckbox from '../components/SparkleCheckbox'
import Modal from '../components/Modal'
import InfoPage from '../components/InfoPage'
import Loader from '../components/Loader'

interface CardsPanelProps {
  user: User | null
  selectedDeck: Deck | null
  cards: Card[]
  showAlert: (msg: string) => void
  isMobile: () => boolean
}

function CardsPanel({ user, selectedDeck, cards, isMobile }: CardsPanelProps){
    const theme = getDeckTheme(selectedDeck?.name);
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

    // The first non-empty suit, independent of search/filter state — this is
    // deliberately NOT derived from groupedCards below, since that's
    // recomputed on every keystroke/filter change and we don't want the
    // loader gating on any of that, only on the deck actually being ready.
    const firstSuitCards = useMemo(() => {
        for (const suit of suitOrder) {
            const suitCards = cards.filter((card) => card.type === suit);
            if (suitCards.length > 0) return suitCards;
        }
        return [];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards]);

    // Rather than blocking on every card image on the page (slow) or not
    // blocking at all (the raw top-to-bottom streaming artifact this whole
    // thing is meant to avoid), wait only on the first suit section's
    // images — the natural "first screenful" boundary — then let the rest
    // fade in individually as the user scrolls (see MiniCard's own
    // onLoad-gated fade-in).
    const [firstSectionReady, setFirstSectionReady] = useState(false);

    useEffect(() => {
        if (!selectedDeck || firstSuitCards.length === 0) return;

        setFirstSectionReady(false);
        let cancelled = false;

        const preloads = firstSuitCards.map((card) => new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // don't hang the loader on one broken image
            img.src = `${selectedDeck.images['card-front']}/${card.type.replaceAll(' ', '')}/${card.nameShort}.png`;
        }));

        Promise.all(preloads).then(() => {
            if (!cancelled) setFirstSectionReady(true);
        });

        return () => { cancelled = true; };
    }, [firstSuitCards, selectedDeck]);

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
            {!firstSectionReady && <Loader/>}
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
                        {!isMobile() && <label>Suit: </label>}
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
                                    <SparkleCheckbox checked={isAnySelected} onChange={toggleAny} unCheckedStyle={{backgroundColor: theme['accent-background'], borderColor: theme['accent-text']}} checkedStyle={{backgroundColor: theme['secondary-background'], borderColor: theme['secondary-text'], color: theme['accent-background']}} />
                                    Any
                                </label>
                                {ALL_SUITS.map((suit) => (
                                    <label key={suit} className="suitDropdownOption">
                                        <SparkleCheckbox checked={isAnySelected || suitFilters.includes(suit)} onChange={() => toggleSuit(suit)} unCheckedStyle={{backgroundColor: theme['accent-background'], borderColor: theme['accent-text']}} checkedStyle={{backgroundColor: theme['secondary-background'], borderColor: theme['secondary-text'], color: theme['accent-background']}} />
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
                    `Remember that tarot cards are a guide, not a strict directive or fortune teller.`,
                    `This page displays all tarot cards in your selected deck, grouped by suit and sorted by value. The default is the Rider-Waite Deck. Visit the Decks page to choose another.`,
                    user === null
                        ? `You're not logged in, so your deck selection will reset on refresh.`
                        : `You're logged in, so any deck you select is saved automatically to your account.`,
                    `Hover over a card to see its upright and reversed keywords, or click it to open its full page.`,
                    `Use the search bar and suit filter, together or separately, to narrow results. The search checks each card's title, description, and meanings, and the filter limits results to one suit.`
                ]} />
            </Modal>
        </>
    )
}


export default CardsPanel