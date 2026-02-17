import { useState, useEffect, useRef } from 'react'
import type { User, Deck } from './types'
import RiderWaiteIcon from './assets/images/Rider-Waite/card-icon.svg?react'
import BunnyWaiteIcon from './assets/images/Bunny-Waite/card-icon.svg?react'
import './App.css'
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import type { TokenResponse } from '@react-oauth/google';
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
import { useLocation, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import type { NavLinkRenderProps } from 'react-router-dom'


function App() {
  const [user, setUser] = useState<User | null>(null)
  const tabs = ["Cards", "Relations", "Decks", "Spreads", "Readings", "Account"];
  const [decks, setDecks] = useState<Deck[]>();
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [width, setWidth] = useState(window.innerWidth);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation()
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

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
  }, [selectedDeck]);

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
    flow: 'implicit',
    scope: 'openid email profile',
    onSuccess: async (tokenResponse: TokenResponse) => {
      try {
        // Fetch user info from Google
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        })

        const userInfo = await res.json()
        const { name, email, picture } = userInfo

        fetch(`/api/users/check?email=${email}`)
          .then(res => res.json())
          .then(data => {
            console.log('Check:', data)
            const pictureWithSize = `${picture}?sz=128`;
            if (data.exists === true) {
              console.log('EXISTS')
              fetch(`/api/users/${data.user_id}`)
                .then(res => res.json())
                .then(data => {
                  const fullUser = { ...data, picture: pictureWithSize }
                  console.log('USER:', fullUser)

                  setUser(fullUser)

                  // 🔹 Fetch selected deck
                  if (fullUser.selectedDeck) {
                    fetchDeckForUser(fullUser.selectedDeck)
                  }
                })
            } else {
              console.log('DOES NOT EXIST')
              fetch('/api/users', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email,
                  name,
                  picture,
                }),
              })
                .then(res => {
                  if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`)
                  }
                  return res.json()
                })
                .then(data => {
                  const fullUser = { ...data, picture: pictureWithSize }
                  console.log('CREATED USER:', fullUser)

                  setUser(fullUser)

                  // 🔹 Fetch selected deck
                  if (fullUser.selectedDeck) {
                    fetchDeckForUser(fullUser.selectedDeck)
                  }
                })
                .catch(err => {
                  console.error('Error creating user:', err)
                })
            }
          })
      } catch (err) {
        console.error('Login failed', err)
      }
    },
    onError: () => {
      console.error('Login Failed')
    },
  })

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
          <Route
            path="/"
            element={<Navigate to="/cards" replace />}
          />

          <Route
            path="/account"
            element={<AccountPanel user={user} setUser={setUser} login={login} handleLogout={handleLogout} selectedDeck={selectedDeck}/>}
          />

          <Route
            path="/cards/:nameShort"
            element={<CardPanel user={user} selectedDeck={selectedDeck} showAlert={showAlert} />}
          />

          <Route
            path="/cards"
            element={<CardsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert}/>}
          />

          <Route
            path="/cards/search/:searchText?/:suitFilter?"
            element={<SearchCardsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert}/>}
          />

          <Route
            path="/relations"
            element={<RelationsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert}/>}
          />

          <Route
            path="/relations/:nameShort1"
            element={<RelationsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert} />}
          />

          <Route
            path="/relations/:nameShort1/:nameShort2"
            element={<RelationsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert}/>}
          />

          <Route
            path="/decks"
            element={<DecksPanel user={user} selectedDeck={selectedDeck}/>}
          />

          <Route
            path="/decks/:deckName"
            element={<DeckPanel user={user} selectedDeck={selectedDeck} setSelectedDeck={setSelectedDeck} showAlert={showAlert}/>}
          />

          <Route
            path="/spreads"
            element={<SpreadsPanel user={user} selectedDeck={selectedDeck}/>}
          />

          <Route
            path="/spreads/:spreadId"
            element={<SpreadPanel user={user} selectedDeck={selectedDeck} showAlert={showAlert}/>}
          />

          <Route
            path="/readings"
            element={<ReadingsPanel user={user} selectedDeck={selectedDeck} width={width} showAlert={showAlert} />}
          />

          <Route
            path="/readings/:readingId"
            element={<ReadingPanel user={user} selectedDeck={selectedDeck} showAlert={showAlert}/>}
          />

          <Route
            path="/physical/:deckName/:cardNameShort"
            element={<PhysicalCard />}
          />
        </Routes>
      </div>

    </>
  )
}

export default App
