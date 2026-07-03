import { useState } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import './ProfileMenu.css';

// Shared profile dropdown for the admin-layout dashboards (Hotel/Mall/Supplier/
// Admin/Support). Mirrors the shop-owner Topbar's dropdown so every business
// type gets the same Profile & Settings / Preview / Onboarding guide / Sign out
// menu instead of a plain non-interactive avatar.
export default function ProfileMenu({ name, email, avatar, avatarColor, items = [], onLogout, logoutLabel = 'Sign out' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pmenu-wrap">
      <button className="pmenu-trigger" onClick={() => setOpen(o => !o)}>
        <div className="admin-avatar sm" style={{ background: avatarColor }}>{avatar}</div>
        <ChevronDown size={14} style={{ color: 'var(--gray-400)' }} />
      </button>

      {open && (
        <div className="pmenu-dropdown" onMouseLeave={() => setOpen(false)}>
          {(name || email) && (
            <>
              <div className="pmenu-header">
                {name && <div className="pmenu-name">{name}</div>}
                {email && <div className="pmenu-email">{email}</div>}
              </div>
              <div className="pmenu-divider" />
            </>
          )}

          {items.map((it, i) => (
            <button key={i} className="pmenu-item" onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon && <it.icon size={13} />} {it.label}
            </button>
          ))}

          {items.length > 0 && <div className="pmenu-divider" />}

          <button className="pmenu-item pmenu-logout" onClick={() => { setOpen(false); onLogout(); }}>
            <LogOut size={13} /> {logoutLabel}
          </button>
        </div>
      )}
    </div>
  );
}