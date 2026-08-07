import { useState, useEffect } from 'react'
import type { User, Deck, Card } from './types'
import { getDeckTheme } from './types'
import RiderWaiteCardIcon from './assets/images/Rider-Waite/card-icon.svg?react'
import BunnyWaiteCardIcon from './assets/images/Bunny-Waite/card-icon.svg?react'
import RiderWaiteIcon from './assets/images/Rider-Waite/card-icon-small.svg?react'
import BunnyWaiteIcon from './assets/images/Bunny-Waite/card-icon-small.svg?react'
import './App.css'
import './MobileApp.css'
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import CardsPanel from './panels/CardsPanel';
import CardPanel from './panels/CardPanel';
import RelationsPanel from './panels/RelationsPanel'
import DecksPanel from './panels/DecksPanel'
import SpreadsPanel from './panels/SpreadsPanel'
import ReadingsPanel from './panels/ReadingsPanel'
import DeckPanel from './panels/DeckPanel'
import SpreadPanel from './panels/SpreadPanel'
import AccountPanel from './panels/AccountPanel'
import ReadingPanel from './panels/ReadingPanel'
import PhysicalCard from './PhysicalCard'
import Alert from './components/Alert';
import Loader from './components/Loader';
import ScrollTopButton from './components/ScrollTopButton';
import InstallPrompt from './InstallPrompt';
import { useLocation, Routes, Route, NavLink, Navigate, matchPath } from 'react-router-dom'
import type { NavLinkRenderProps } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import SidebarMenu from './components/SidebarMenu'


function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isInStandaloneMode() {
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function App() {
  const MOBILE_BREAKPOINT = 430;
  const TABS_BREAKPOINT = 850;
  const [user, setUser] = useState<User | null>(null)
  const tabs = ["Cards", "Relations", "Decks", "Spreads", "Readings", "Account"];
  const [decks, setDecks] = useState<Deck[]>();
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [width, setWidth] = useState(window.innerWidth);

  const location = useLocation()
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
      const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installCheckComplete, setInstallCheckComplete] = useState(false);

  const [showOverlay, setShowOverlay] = useState<{show: boolean, item: string | null}>({show: false, item: null});

  const currentRoute = location.pathname.split('/')[1] || 'cards'
  
  const CardIcon =
    selectedDeck?.name?.replace(/[–—]/g, "-") === "Bunny-Waite"
      ? BunnyWaiteCardIcon
      : RiderWaiteCardIcon;
  
  const Icon = 
    selectedDeck?.name?.replace(/[–—]/g, "-") === "Bunny-Waite"
      ? BunnyWaiteIcon
      : RiderWaiteIcon;
  
  useEffect(() => {
    const handleResize = () => {
        setWidth(window.innerWidth)
    };

    window.addEventListener('resize', handleResize);

    // cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!savedToken || !savedUser) return;

    const parsedUser = JSON.parse(savedUser);

    setToken(savedToken);
    setUser(parsedUser);

    // restore their actual deck, not the default
    if (parsedUser.selectedDeck) {
      fetchDeckForUser(parsedUser.selectedDeck);
    }

    fetch(`/api/users/check?id=${parsedUser.id}`, {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Invalid session');
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  }, []);

  useEffect(() => {
    if (isIos() && !isInStandaloneMode()) {
      setShowInstallPrompt(true);
    }

    setInstallCheckComplete(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Show button after 300px scroll
      setShowOverlay({show: scrollY > 300, item: "scrollTop"});
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showOverlay]);

  useEffect(() => {
    fetch('/api/cards')
      .then(res => res.json())
      .then((data: Card[]) => setCards(data))
      .catch(err => console.error('Failed to fetch cards:', err));
  }, []);

  useEffect(() => {
    fetch('/api/decks')
      .then(res => res.json())
      .then(data => {
        setDecks(data);

        // don't override a deck being restored for a logged-in user
        const hasSavedSession = localStorage.getItem('token') && localStorage.getItem('user');

        if (selectedDeck === null && !hasSavedSession) {
          const riderWaite = data.find(
            (deck: Deck) => deck.name?.replace(/[–—]/g, "-") === "Rider-Waite"
          );
          setSelectedDeck(riderWaite ?? data[0]);
        }
      });
  }, []);

  useEffect(() => {
    console.log('[theme effect] fired', { decks, selectedDeck, path: location.pathname });
    if (decks === undefined) {
        console.log('[theme effect] bail: decks undefined');
        return;
      }
    if (decks === undefined) return;

    // Check if we're on a /physical/:deckName/:cardNameShort route
    const physicalMatch = matchPath(
      '/physical/:deckName/:cardNameShort',
      location.pathname
    );

    // Determine which deck's style to use
    let activeDeck: Deck | null = selectedDeck;

    if (physicalMatch) {
      const routeDeckName = physicalMatch.params.deckName;
      const matchedDeck = decks.find(
        (deck) => deck.name?.replace(/[–—]/g, "-") === routeDeckName
      );
      activeDeck = matchedDeck ?? null;
    }

    if (activeDeck === null) {
      console.log('[theme effect] bail: activeDeck undefined');
      return;
    }

    // Themes are a static name -> Theme lookup now (see types.ts), not data
    // fetched off the deck — always complete, so there's nothing left to
    // validate here.
    const selectedStyle = getDeckTheme(activeDeck.name);

    const root = document.documentElement;

    for (const [key, value] of Object.entries(selectedStyle)) {
      root.style.setProperty(`--${key}`, value);
    }

    const themeColor = selectedStyle['main-background'];

    if (themeColor) {
      let metaTheme = document.querySelector(
        "meta[name='theme-color']"
      ) as HTMLMetaElement | null;

      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.name = "theme-color";
        document.head.appendChild(metaTheme);
      }

      metaTheme.content = themeColor;
    }
  }, [selectedDeck, decks, location.pathname]);

  const isMobile = () => {
    return width <= MOBILE_BREAKPOINT;
  };

  const isCollapsedTabs = () => {
    return width <= TABS_BREAKPOINT;
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const fetchDeckForUser = async (deckId: string) => {
    try {
      const res = await fetch(`/api/decks/${deckId}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch deck: ${res.status}`)
      }
      const deck = await res.json()
      setSelectedDeck(deck)
    } catch (err) {
      console.error('Error fetching selected deck:', err)
      setSelectedDeck(null)
    }
  }

  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'openid email profile',
    onSuccess: async (codeResponse: { code: string }) => {
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
        });

        if (!res.ok) throw new Error(`Google login failed with status ${res.status}`);
        const { user, token } = await res.json();

        setUser(user);
        setToken(token);

        // persist across refresh
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        if (user.selectedDeck) {
          fetchDeckForUser(user.selectedDeck);
        }
      } catch (err) {
        console.error('Login failed:', err);
      }
    },
    onError: () => {
      console.error('Login failed');
    },
  });

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setToken(null); // you weren't clearing this before either — worth fixing

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    if (decks && decks.length > 0) {
      const riderWaite = decks.find(
        (deck: Deck) => deck.name?.replace(/[–—]/g, "-") === "Rider-Waite"
      );
      setSelectedDeck(riderWaite ?? decks[0]);
    }
  };

  const showAlert = (message: string) => {
    setAlertMessage(message)
  }

  const hideAlert = () => {
    setAlertMessage(null)
  }

  const setUserSelectedDeck = async (deckId: string) => {
      if (!user || !token) {
          showAlert("You're logged out, this selection will disappear when you refresh!");
          const deckRes = await fetch(`/api/decks/${deckId}`);
          const fullDeck = await deckRes.json();
          setSelectedDeck(fullDeck);
          return;
      }

      try {
          const res = await fetch('/api/users/setDeck', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId: user.id, deckId }),
          });

          if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to set deck");
          }

          const updatedUser = await res.json();
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser)); // keep cache in sync

          const deckRes = await fetch(`/api/decks/${deckId}`);
          const fullDeck = await deckRes.json();
          setSelectedDeck(fullDeck);

      } catch (err) {
          console.error("Set deck failed:", err);
          showAlert("Failed to save deck selection.");
      }
  };


  return (
    <>
    {alertMessage && (
      <Alert
        message={alertMessage}
        visible={true}
        onClose={hideAlert}
      />
    )}
    {loading && (
      <Loader/>
    )}
      <div className='header'>
        <div className="tabContainer">
          <div className="headerLeft">
            <CardIcon className="logo" />
            <h1 className='title'>
              Cute-Tarot
            </h1>
          </div>
          {
            isCollapsedTabs() ? (
              <div className="tabs">
                <button className="menuBtn" onClick={() => setShowOverlay({show: true, item: "menu"})}>
                  <FontAwesomeIcon icon={faBars}></FontAwesomeIcon>
                  {!isMobile() && 
                    "Menu"
                  }
                </button>
              </div>
            ):(
              <div className="tabs tabsWide">
                {tabs.map((tab) => {
                  const path = tab.toLowerCase()

                  if (tab === "Account") {
                    return user === null ? (
                      <button
                        key={tab}
                        className="accountLoginBtn"
                        onClick={() => login()}
                      >
                        Log In
                      </button>
                    ) : (
                      <NavLink
                        key={tab}
                        to="/account"
                        className={({ isActive }: NavLinkRenderProps) => isActive ? "selected" : ""}
                      >
                        Account
                      </NavLink>
                    )
                  }

                  return (
                    <NavLink
                      key={tab}
                      to={`/${path}`}
                      className={({ isActive }: NavLinkRenderProps) => isActive ? "selected" : ""}
                    >
                      {tab}
                    </NavLink>
                  )
                })}
                <div
                  className="timeframe-indicator"
                  data-selected={currentRoute}
                />
              </div>
            )
          }
        </div>
      </div>
      <SidebarMenu user={user} showOverlay={showOverlay} setShowOverlay={setShowOverlay} tabs={tabs} handleLogout={handleLogout} login={login} />
      <div className="outerPanel">
        <div className="panelBuffer">
          <Routes>
            {!installCheckComplete ? (
              <Route path="*" element={null} />
            ) : showInstallPrompt ? (
              <Route
                path="/"
                element={<InstallPrompt setShowInstallPrompt={setShowInstallPrompt} />}
              />
            ) : (
              <Route path="/" element={<Navigate to="/cards" replace />} />
            )}

            <Route
              path="/account"
              element={<AccountPanel user={user} setUser={setUser} login={login} handleLogout={handleLogout} token={token} cards={cards} decks={decks ?? []} showAlert={showAlert} setLoading={setLoading} isMobile={isMobile}/>}
            />

            <Route
              path="/cards/:nameShort"
              element={<CardPanel user={user} selectedDeck={selectedDeck} cards={cards} setCards={setCards} showAlert={showAlert} token={token}/>}
            />

            <Route
              path="/cards"
              element={<CardsPanel user={user} selectedDeck={selectedDeck} cards={cards} showAlert={showAlert} isMobile={isMobile}/>}
            />

            <Route
              path="/relations"
              element={<RelationsPanel user={user} selectedDeck={selectedDeck} cards={cards} showAlert={showAlert} token={token} Icon={Icon}/>}
            />

            <Route
              path="/relations/:nameShort1"
              element={<RelationsPanel user={user} selectedDeck={selectedDeck} cards={cards} showAlert={showAlert} token={token} Icon={Icon}/>}
            />

            <Route
              path="/relations/none/:nameShort2"
              element={<RelationsPanel user={user} selectedDeck={selectedDeck} cards={cards} showAlert={showAlert} token={token} Icon={Icon}/>}
            />

            <Route
              path="/relations/:nameShort1/:nameShort2"
              element={<RelationsPanel user={user} selectedDeck={selectedDeck} cards={cards} showAlert={showAlert} token={token} Icon={Icon}/>}
            />

            <Route
              path="/decks"
              element={<DecksPanel user={user} selectedDeck={selectedDeck} decks={decks ?? []} setUserSelectedDeck={setUserSelectedDeck}/>}
            />

            <Route
              path="/decks/:deckName"
              element={<DeckPanel user={user} selectedDeck={selectedDeck} decks={decks ?? []} setDecks={setDecks} cards={cards} showAlert={showAlert} token={token} setUserSelectedDeck={setUserSelectedDeck} isMobile={isMobile}/>}
            />

            <Route
              path="/spreads"
              element={<SpreadsPanel setLoading={setLoading} CardIcon={CardIcon} isMobile={isMobile}/>}
            />

            <Route
              path="/spreads/:spreadId"
              element={<SpreadPanel user={user} showAlert={showAlert} setLoading={setLoading} token={token} Icon={Icon}/>}
            />

            <Route
              path="/readings"
              element={<ReadingsPanel user={user} selectedDeck={selectedDeck} decks={decks ?? []} cards={cards} showAlert={showAlert} setLoading={setLoading} token={token} Icon={Icon} CardIcon={CardIcon} isMobile={isMobile}/>}
            />

            <Route
              path="/readings/:readingId"
              element={<ReadingPanel selectedDeck={selectedDeck} decks={decks ?? []} cards={cards} showAlert={showAlert} setLoading={setLoading} token={token} isMobile={isMobile} setUserSelectedDeck={setUserSelectedDeck}/>}
            />

            <Route
              path="/physical/:deckName/:cardNameShort"
              element={<PhysicalCard decks={decks ?? []} cards={cards} setUserSelectedDeck={setUserSelectedDeck} />}
            />
          </Routes>
        </div>
      </div>
      {showOverlay.show && showOverlay.item === "scrollTop" && (
        <ScrollTopButton scrollToTop={scrollToTop}/>
      )}
    </>
  )
}

export default App
