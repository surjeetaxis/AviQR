import { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';
import GlobalSearch from '../components/GlobalSearch.jsx';
import OwnerBottomNav from '../components/OwnerBottomNav.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { OutletProvider } from '../context/OutletContext.jsx';
import { orderApi } from '../api/index.js';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const [liveOrderCount, setLiveOrderCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('aviqr_sidebar_collapsed') === '1');
  const { user } = useAuth();
  const { outletId } = useParams();
  const basePath = outletId ? `/hotel/outlets/${outletId}` : '';

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

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('aviqr_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  };

  const content = (
    <div className={`layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar liveOrderCount={liveOrderCount} basePath={basePath} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      <div className="layout-main">
        <Topbar onSearchOpen={() => setSearchOpen(true)} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
      <OwnerBottomNav liveOrderCount={liveOrderCount} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );

  return outletId ? <OutletProvider outletId={outletId}>{content}</OutletProvider> : content;
}
