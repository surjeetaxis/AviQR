import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, LogOut, ChevronDown } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext.jsx';
import { LangPicker } from './shared/LangPicker.jsx';
import { useLang } from './shared/LangPicker.jsx';
import { t } from '../i18n/translations.js';
import './Topbar.css';

export default function Topbar({ onMenuClick, onSearchOpen }) {
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <header className="topbar">
      <button className="topbar-menu" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="topbar-search" onClick={onSearchOpen} style={{ cursor:'pointer' }}>
        <Search size={16} className="topbar-search-icon" aria-hidden="true" />
        <input type="search" placeholder={t('search', lang)} aria-label="Search"
               readOnly onClick={onSearchOpen} style={{ cursor:'pointer' }} />
        <kbd className="topbar-kbd">⌘ K</kbd>
      </div>

      <div className="topbar-actions">
        <LangPicker />
        <button className="topbar-icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="topbar-notif-dot" aria-hidden="true" />
        </button>
        <div className="topbar-divider" aria-hidden="true" />

        <div className="topbar-profile-wrap">
          <button className="topbar-profile" onClick={() => setShowDropdown(p => !p)}>
            <div className="topbar-avatar">{user?.avatar || 'SN'}</div>
            <div className="topbar-profile-text">
              <span className="topbar-profile-name">{user?.name?.split(' ')[0] || 'Owner'}</span>
              <span className="topbar-profile-role">{ROLE_LABELS[user?.role] || 'Owner'}</span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--gray-400)' }} />
          </button>

          {showDropdown && (
            <div className="topbar-dropdown" onMouseLeave={() => setShowDropdown(false)}>
              <div className="topbar-dropdown-header">
                <div className="topbar-dropdown-name">{user?.name}</div>
                <div className="topbar-dropdown-email">{user?.email}</div>
              </div>
              <div className="topbar-dropdown-divider" />
              <button className="topbar-dropdown-item" onClick={() => { setShowDropdown(false); navigate('/settings'); }}>
                {t('profile', lang)} & {t('settings', lang)}
              </button>
              <button className="topbar-dropdown-item" onClick={() => { setShowDropdown(false); navigate('/customer'); }}>
                Preview customer menu
              </button>
              <button className="topbar-dropdown-item" onClick={() => { setShowDropdown(false); navigate('/onboarding'); }}>
                Onboarding guide
              </button>
              <div className="topbar-dropdown-divider" />
              <button className="topbar-dropdown-item topbar-dropdown-logout" onClick={handleLogout}>
                <LogOut size={13} /> {t('logout', lang)}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
