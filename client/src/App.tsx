import { useState, useEffect, useRef } from 'react'
import type { User, Deck } from './types'
import RiderWaiteIcon from './assets/images/Rider-Waite/card-icon.svg?react'
import BunnyWaiteIcon from './assets/images/Bunny-Waite/card-icon.svg?react'
import './App.css'
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
import SearchCardsPanel from './panels/SearchCardsPanel';
import PhysicalCard from './PhysicalCard'
import Alert from './components/Alert';
import Loader from './components/Loader';
import ScrollTopButton from './components/ScrollTopButton';
import InstallPrompt from './InstallPrompt';
import { useLocation, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import type { NavLinkRenderProps } from 'react-router-dom'


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
  const [user, setUser] = useState<User | null>(null)
  const tabs = ["Cards", "Relations", "Decks", "Spreads", "Readings", "Account"];
  const [decks, setDecks] = useState<Deck[]>();
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [width, setWidth] = useState(window.innerWidth);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation()
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  /*const currentTab = (() => {
    const path = location.pathname.replace('/', '')
    if (!path) return 'Cards'
    return path.charAt(0).toUpperCase() + path.slice(1)
  })()*/
  const currentRoute = location.pathname.split('/')[1] || 'cards'

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    // cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isIos() && !isInStandaloneMode()) {
      setShowInstallPrompt(true);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Show button after 300px scroll
      setShowScrollTop(scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    fetch('/api/decks')
      .then(res => res.json())
      .then(data => {
        console.log(data);
        setDecks(data);

        if (selectedDeck === null) {
          const riderWaite = data.find(
            (deck: Deck) =>
              deck.name?.replace(/[–—]/g, "-") === "Rider-Waite"
          );

          setSelectedDeck(riderWaite ?? data[0]);
        }
      });
  }, []);


  useEffect(() => {
    if(modalRef.current === null){
      return;
    }
    if(menuOpen === true){
        modalRef.current.style.display = "flex";
    }else if(menuOpen === false){
        modalRef.current.style.display = "none";
    }
  }, [menuOpen]);

  useEffect(() => {
    if(selectedDeck === null || selectedDeck.style === null){
      return;
    }
    let selectedStyle = selectedDeck.style;

    const requiredKeys = [
      'main-background',
      'main-text',
      'secondary-background',
      'secondary-text',
      'accent-background',
      'accent-text',
      'border-radius',
      'border-radius-small',
    ] as const;

    // Ensure all required style values exist
    for (const key of requiredKeys) {
      if (selectedStyle[key] == null) return;
    }

    const root = document.documentElement; // safer than querySelector

    for (const [key, value] of Object.entries(selectedStyle)) {
      if (value != null) {
        root.style.setProperty(`--${key}`, value);
      }
    }

    // Dynamically update browser theme color
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
  }, [selectedDeck]);

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
    flow: 'auth-code', // auth code flow
    scope: 'openid email profile',
    onSuccess: async (codeResponse: { code: string }) => {
      try {
        console.log('Received code:', codeResponse.code); 
        // Send the auth code to our backend
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
        });

        if (!res.ok) throw new Error(`Google login failed with status ${res.status}`);
        const { user, token } = await res.json();

        // Save user and backend token
        setUser(user);
        setToken(token);

        console.log('Logged in user:', user);
        console.log('TOKEN: ' + token);;

        // Optional: fetch user's selected deck
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
    googleLogout()
    setUser(null)
    if(decks && decks.length > 0){
      const riderWaite = decks.find(
        (deck: Deck) =>
          deck.name?.replace(/[–—]/g, "-") === "Rider-Waite"
      );

      setSelectedDeck(riderWaite ?? decks[0]);
    }
  }

  const showAlert = (message: string) => {
    setAlertMessage(message)
  }

  const hideAlert = () => {
    setAlertMessage(null)
  }

  const HeaderIcon =
  selectedDeck?.name?.replace(/[–—]/g, "-") === "Bunny-Waite"
    ? BunnyWaiteIcon
    : RiderWaiteIcon;

  console.log("Selected deck:", selectedDeck?.name);
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
        <HeaderIcon className="logo" />
        <h1 className='title'>
          {width >= 400 ? "Cute-Tarot":"Tarot"}
        </h1>
        {width >= 400 && (
          user === null ? (
            <button className="loginBtn" onClick={() => login()}>
              Log In
            </button>
          ) : (
            <button className="loginBtn" onClick={handleLogout}>
              Log Out
            </button>
          )
        )}
      </div>
      <div className='outerTabs'>
        <div className='tabContainer'>
          {width >= 400 && (
            <div className="tabs">
            {tabs.map((tab) => {
              const path = tab.toLowerCase()
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
          )}
          {width < 400 && (
            <div className="tabs">
                <button onClick={()=>setMenuOpen(true)}>Menu</button>
                {user === null ? (
                  <button className="loginBtn" onClick={() => login()}>
                    Log In
                  </button>
                ) : (
                  <button className="loginBtn" onClick={handleLogout}>
                    Log Out
                  </button>
                )}
            </div>
          )}
        </div>
      </div>
      <div className="modal" ref={modalRef}>
        <div className="modal-content">
            <span className="close" onClick={()=>setMenuOpen(false)}>&times;</span>
            <h2 className='menuTitle'>Menu</h2>
            <div className='menuLinks'>
              {tabs.map((tab) => {
                const path = tab.toLowerCase()
                return (
                  <NavLink
                    key={tab}
                    to={`/${path}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {tab}
                  </NavLink>
                )
              })}
            </div>
            <div className='menuTitle'>
              {user === null ? (
                <button className="menuLoginBtn" onClick={() => login()}>
                  Log In
                </button>
              ) : (
                <button className="menuLoginBtn" onClick={handleLogout}>
                  Log Out
                </button>
              )}
            </div>
        </div>
    </div>
      <div className="outerPanel">
        <Routes>
          {showInstallPrompt === true ? (
            <Route
              path="/"
              element={<InstallPrompt setShowInstallPrompt={setShowInstallPrompt} />}
            />
          ):(
            <Route
              path="/"
              element={<Navigate to="/cards" replace />}
            />
          )}

          <Route
            path="/account"
            element={<AccountPanel user={user} setUser={setUser} login={login} handleLogout={handleLogout} selectedDeck={selectedDeck} setLoading={setLoading} token={token}/>}
          />

          <Route
            path="/cards/:nameShort"
            element={<CardPanel user={user} selectedDeck={selectedDeck} showAlert={showAlert} setLoading={setLoading} token={token}/>}
          />

          <Route
            path="/cards"
            element={<CardsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert} setLoading={setLoading}/>}
          />

          <Route
            path="/cards/search/:searchText?/:suitFilter?"
            element={<SearchCardsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert} setLoading={setLoading}/>}
          />

          <Route
            path="/relations"
            element={<RelationsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert} setLoading={setLoading} token={token}/>}
          />

          <Route
            path="/relations/:nameShort1"
            element={<RelationsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert} setLoading={setLoading} token={token}/>}
          />

          <Route
            path="/relations/:nameShort1/:nameShort2"
            element={<RelationsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert} setLoading={setLoading} token={token}/>}
          />

          <Route
            path="/decks"
            element={<DecksPanel user={user} selectedDeck={selectedDeck} setLoading={setLoading}/>}
          />

          <Route
            path="/decks/:deckName"
            element={<DeckPanel user={user} selectedDeck={selectedDeck} setSelectedDeck={setSelectedDeck} showAlert={showAlert} setLoading={setLoading} token={token}/>}
          />

          <Route
            path="/spreads"
            element={<SpreadsPanel user={user} selectedDeck={selectedDeck} setLoading={setLoading}/>}
          />

          <Route
            path="/spreads/:spreadId"
            element={<SpreadPanel user={user} selectedDeck={selectedDeck} showAlert={showAlert} setLoading={setLoading} token={token}/>}
          />

          <Route
            path="/readings"
            element={<ReadingsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert} setLoading={setLoading} token={token}/>}
          />

          <Route
            path="/readings/:readingId"
            element={<ReadingPanel user={user} selectedDeck={selectedDeck} showAlert={showAlert} setLoading={setLoading} token={token}/>}
          />

          <Route
            path="/physical/:deckName/:cardNameShort"
            element={<PhysicalCard />}
          />
        </Routes>
      </div>
      {showScrollTop && (
        <ScrollTopButton scrollToTop={scrollToTop}/>
      )}
    </>
  )
}

export default App
