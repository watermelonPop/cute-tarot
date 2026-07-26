import { useState, useEffect } from 'react'
import { useLocation, matchPath } from 'react-router-dom'
import { useGoogleLogin, googleLogout } from '@react-oauth/google'
import type { User, Deck } from '../types'
import RiderWaiteCardIcon from '../assets/images/Rider-Waite/card-icon.svg?react'
import BunnyWaiteCardIcon from '../assets/images/Bunny-Waite/card-icon.svg?react'
import RiderWaiteIcon from '../assets/images/Rider-Waite/card-icon-small.svg?react'
import BunnyWaiteIcon from '../assets/images/Bunny-Waite/card-icon-small.svg?react'

function isIos() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isInStandaloneMode() {
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function useAppShell() {
  const [user, setUser] = useState<User | null>(null)
  const [decks, setDecks] = useState<Deck[]>();
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
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
    if (isIos() && !isInStandaloneMode()) {
      setShowInstallPrompt(true);
    }
    setInstallCheckComplete(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowOverlay({show: scrollY > 300, item: "scrollTop"});
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showOverlay]);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (!savedToken || !savedUser) return;

    const parsedUser = JSON.parse(savedUser);
    setToken(savedToken);
    setUser(parsedUser);

    if (parsedUser.selectedDeck) {
      fetchDeckForUser(parsedUser.selectedDeck);
    }

    fetch(`/api/users/check?id=${parsedUser.id}`, {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then(res => { if (!res.ok) throw new Error('Invalid session'); })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  }, []);

  useEffect(() => {
    fetch('/api/decks')
      .then(res => res.json())
      .then(data => {
        setDecks(data);
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
    if (decks === undefined) return;

    const physicalMatch = matchPath('/physical/:deckName/:cardNameShort', location.pathname);
    let activeDeck: Deck | null = selectedDeck;

    if (physicalMatch) {
      const routeDeckName = physicalMatch.params.deckName;
      const matchedDeck = decks.find(
        (deck) => deck.name?.replace(/[–—]/g, "-") === routeDeckName
      );
      activeDeck = matchedDeck ?? null;
    }

    if (activeDeck === null || activeDeck.style === null) return;

    const selectedStyle = activeDeck.style;
    const requiredKeys = [
      'main-background', 'main-text', 'secondary-background', 'secondary-text',
      'accent-background', 'accent-text', 'border-radius', 'border-radius-small',
    ] as const;

    for (const key of requiredKeys) {
      if (selectedStyle[key] == null) {
        console.warn(`Theme apply skipped — missing "${key}" on`, selectedStyle);
        return;
      }
    }

    const root = document.documentElement;
    for (const [key, value] of Object.entries(selectedStyle)) {
      if (value != null) root.style.setProperty(`--${key}`, value);
    }

    const themeColor = selectedStyle['main-background'];
    if (themeColor) {
      let metaTheme = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null;
      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.name = "theme-color";
        document.head.appendChild(metaTheme);
      }
      metaTheme.content = themeColor;
    }
  }, [selectedDeck, decks, location.pathname]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const fetchDeckForUser = async (deckId: string) => {
    try {
      const res = await fetch(`/api/decks/${deckId}`)
      if (!res.ok) throw new Error(`Failed to fetch deck: ${res.status}`)
      setSelectedDeck(await res.json())
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
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        if (user.selectedDeck) fetchDeckForUser(user.selectedDeck);
      } catch (err) {
        console.error('Login failed:', err);
      }
    },
    onError: () => console.error('Login failed'),
  });

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    if (decks && decks.length > 0) {
      const riderWaite = decks.find(
        (deck: Deck) => deck.name?.replace(/[–—]/g, "-") === "Rider-Waite"
      );
      setSelectedDeck(riderWaite ?? decks[0]);
    }
  }

  const showAlert = (message: string) => setAlertMessage(message)
  const hideAlert = () => setAlertMessage(null)

  const setUserSelectedDeck = async (deckId: string) => {
    if (!user || !token) {
      showAlert("You're logged out, this selection will disappear when you refresh!");
      const deckRes = await fetch(`/api/decks/${deckId}`);
      setSelectedDeck(await deckRes.json());
      return;
    }
    try {
      const res = await fetch('/api/users/setDeck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, deckId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to set deck");
      }
      const updatedUser = await res.json();
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      const deckRes = await fetch(`/api/decks/${deckId}`);
      setSelectedDeck(await deckRes.json());
    } catch (err) {
      console.error("Set deck failed:", err);
      showAlert("Failed to save deck selection.");
    }
  };

  return {
    user, setUser, decks, selectedDeck, setSelectedDeck,
    token, loading, setLoading, alertMessage, showAlert, hideAlert,
    showInstallPrompt, setShowInstallPrompt, installCheckComplete,
    showOverlay, setShowOverlay, currentRoute, CardIcon, Icon,
    login, handleLogout, setUserSelectedDeck, scrollToTop,
  };
}