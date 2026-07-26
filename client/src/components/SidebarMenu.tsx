import { useState, useEffect } from 'react'
import './SidebarMenu.css'
import { NavLink, type NavLinkRenderProps } from 'react-router-dom'
import { type User } from '../types'

interface SidebarMenuProps {
    user: User | null;
    showOverlay: {show: boolean, item: string | null};
    setShowOverlay: (overlay: {show: boolean, item: string | null}) => void;
    tabs: string[];
    handleLogout: () => void;
    login: () => void;
}

export default function SidebarMenu({ showOverlay, setShowOverlay, tabs, user, handleLogout, login }: SidebarMenuProps) {
    const isMenu = showOverlay.item === "menu";
    const wantsOpen = isMenu && showOverlay.show;

    const [shouldRender, setShouldRender] = useState(wantsOpen);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (wantsOpen) {
            setShouldRender(true);
            const raf = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsOpen(true);
                });
            });
            return () => cancelAnimationFrame(raf);
        } else {
            setIsOpen(false);
        }
    }, [wantsOpen]);

    if (!shouldRender) return null;

    const handleTransitionEnd = () => {
        if (!wantsOpen) {
            setShouldRender(false);
        }
    };

    return (
        <>
        <div
            className={`sidebarOverlay ${isOpen ? 'open' : ''}`}
            onClick={() => setShowOverlay({show: false, item: null})}
        />
        <div
            className={`sidebar ${isOpen ? 'open' : ''}`}
            onTransitionEnd={handleTransitionEnd}
        >
            <div className="sidebarHeader">
            <h2 className='menuTitle'>Menu</h2>
            <span className="close" onClick={() => setShowOverlay({show: false, item: null})}>&times;</span>
            </div>

            <div className='menuLinks'>
            {tabs
                .filter((tab) => tab !== "Account") // handled separately below, pinned to bottom
                .map((tab) => {
                    const path = tab.toLowerCase()
                    return (
                        <NavLink
                            key={tab}
                            to={`/${path}`}
                            onClick={() => setShowOverlay({show: false, item: null})}
                            className={({ isActive }: NavLinkRenderProps) => isActive ? "selected" : ""}
                        >
                            {tab}
                        </NavLink>
                    )
                })}
            </div>

            {user === null ? (
                <button
                    className="sidebarAccountBtn"
                    onClick={() => { setShowOverlay({show: false, item: null}); login(); }}
                >
                    Log In
                </button>
            ) : (
                <>
                    <NavLink
                        to="/account"
                        onClick={() => setShowOverlay({show: false, item: null})}
                        className={({ isActive }: NavLinkRenderProps) => `sidebarMenuLink ${isActive ? "selected" : ""}`}
                    >
                        Account
                    </NavLink>
                    <button
                        className="sidebarLogoutBtn"
                        onClick={() => { setShowOverlay({show: false, item: null}); handleLogout(); }}
                    >
                        Log Out
                    </button>
                </>
            )}
        </div>
      </>
    )
}