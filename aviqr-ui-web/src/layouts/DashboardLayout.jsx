import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';
import GlobalSearch from '../components/GlobalSearch.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { orderApi } from '../api/index.js';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [liveOrderCount, setLiveOrderCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const shopId = user?.shopId;
    if (!shopId) return;
    const fetch = async () => {
      try {
        const res = await orderApi.getLiveOrders(shopId);
        const data = res.data.data || [];
        const active = data.filter(o => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status));
        setLiveOrderCount(active.length);
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [user?.shopId]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="layout">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} liveOrderCount={liveOrderCount} />
      {mobileOpen && <div className="layout-backdrop" onClick={() => setMobileOpen(false)} />}
      <div className="layout-main">
        <Topbar onMenuClick={() => setMobileOpen(true)} onSearchOpen={() => setSearchOpen(true)} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
