import { useLayoutEffect, useRef, useState } from 'react';
import './BottomNav.css';

// Generic floating pill bottom-nav: a single raised circle indicator slides
// to whichever tab is active (one animated transform, not per-button state).
// The indicator's position is measured from the actual active button's
// on-screen position (not CSS percentage math) so it stays correct
// regardless of padding or uneven tab widths — including the two edge tabs,
// which need extra clearance from the pill's rounded corners.
//
// Props:
//   tabs      [{ key, label, icon: LucideIcon }]
//   activeKey string — which tab.key is currently active
//   badges    { [key]: number } — optional count badge per tab
//   onTabClick(key)
export default function BottomNav({ tabs, activeKey, badges = {}, onTabClick }) {
  const rowRef = useRef(null);
  const btnRefs = useRef({});
  const [indicatorX, setIndicatorX] = useState(null);

  const activeIndex = Math.max(0, tabs.findIndex(t => t.key === activeKey));
  const ActiveIcon = tabs[activeIndex]?.icon;
  const activeBadge = badges[tabs[activeIndex]?.key];

  useLayoutEffect(() => {
    const measure = () => {
      const btn = btnRefs.current[activeKey];
      const row = rowRef.current;
      if (!btn || !row) return;
      const rowBox = row.getBoundingClientRect();
      const btnBox = btn.getBoundingClientRect();
      setIndicatorX(btnBox.left - rowBox.left + btnBox.width / 2);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeKey, tabs]);

  return (
    <nav className="bn-wrap" aria-label="Bottom navigation">
      <div className="bn-row" ref={rowRef}>
        {indicatorX !== null && (
          <div
            className="bn-indicator"
            style={{ left: indicatorX }}
            aria-hidden="true"
          >
            <span className="bn-indicator-circle">
              {ActiveIcon && <ActiveIcon size={20} />}
              {!!activeBadge && <span className="bn-badge">{activeBadge}</span>}
            </span>
          </div>
        )}

        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeKey === tab.key;
          const badge = badges[tab.key];
          return (
            <button
              key={tab.key}
              ref={el => { btnRefs.current[tab.key] = el; }}
              className={`bn-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabClick(tab.key)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="bn-icon-wrap">
                <Icon size={20} />
                {/* Only the icon glyph hides for the active tab (indicator shows
                    it raised instead) — the badge stays put so a cart count is
                    still visible even while its tab is active. */}
                {!!badge && !isActive && <span className="bn-badge">{badge}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
