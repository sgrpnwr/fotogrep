'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Search, Upload, User } from 'lucide-react';
import '../app/navbar.css';

interface NavbarProps {
  onPostCreated?: () => void;
}

export default function Navbar({ onPostCreated }: NavbarProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState({ username: '', email: '' });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <Link href="/" className="navbar-logo">
            fotogrep
          </Link>

          <div className="navbar-right">
            <div className="user-menu-wrapper">
              <button
                className="user-avatar"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.username ? user.username.charAt(0).toUpperCase() : '?'}
              </button>

              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-username">{user.username}</p>
                    <p className="dropdown-email">{user.email}</p>
                  </div>
                  <hr className="dropdown-divider" />
                  <Link href="/profile" className="dropdown-item">
                    Profile
                  </Link>
                  <Link href="/settings" className="dropdown-item">
                    Settings
                  </Link>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav">
        <Link href="/" className="mobile-nav-item">
          <Home size={20} strokeWidth={1.5} />
        </Link>
        <Link href="/search" className="mobile-nav-item">
          <Search size={20} strokeWidth={1.5} />
        </Link>
        <button 
          className="mobile-nav-item upload-item" 
          onClick={() => router.push('/upload')}
        >
          <Upload size={20} strokeWidth={1.5} />
        </button>
        <Link href="/profile" className="mobile-nav-item profile-link">
          <User size={20} strokeWidth={1.5} />
        </Link>
      </div>

      {/* Mobile User Menu Overlay */}
      {showUserMenu && (
        <div className="mobile-menu-overlay" onClick={() => setShowUserMenu(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h3>{user.username}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowUserMenu(false)}
              >
                ✕
              </button>
            </div>
            <hr className="menu-divider" />
            <Link href="/profile" className="mobile-menu-item">
              Profile
            </Link>
            <Link href="/settings" className="mobile-menu-item">
              Settings
            </Link>
            <hr className="menu-divider" />
            <button className="mobile-menu-item logout-item" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
