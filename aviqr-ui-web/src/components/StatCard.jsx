import { Wallet, ShoppingBag, Users, TrendingUp, BarChart3, Receipt, Clock, Store } from 'lucide-react';
import './StatCard.css';
const METRIC_ICONS = {'💰':Wallet,'🛍️':ShoppingBag,'📦':ShoppingBag,'👥':Users,'📈':TrendingUp,'📊':BarChart3,'🧾':Receipt,'⏱️':Clock,'🏪':Store};

export default function StatCard({ icon, label, value, sub, up, color = '#146c50' }) {
  const MetricIcon = METRIC_ICONS[icon] || BarChart3;
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: color + '18', color }}>
        {typeof icon === 'string'
          ? <MetricIcon size={20} aria-hidden="true" />
          : icon}
      </div>
      <div className="stat-card-body">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {sub && (
          <div className="stat-card-sub" style={{ color: up ? 'var(--green)' : 'var(--gray-500)' }}>
            {up != null && (up ? '↑ ' : '↓ ')}{sub}
          </div>
        )}
      </div>
    </div>
  );
}
