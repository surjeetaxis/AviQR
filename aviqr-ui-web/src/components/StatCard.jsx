import './StatCard.css';

export default function StatCard({ icon, label, value, sub, up, color = '#1D9E75' }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: color + '18', color }}>
        {typeof icon === 'string'
          ? <span style={{ fontSize: 20 }}>{icon}</span>
          : icon}
      </div>
      <div className="stat-card-body">
        <div className="stat-card-value" style={{ color }}>{value}</div>
        <div className="stat-card-label">{label}</div>
        {sub && (
          <div className="stat-card-sub" style={{ color: up ? '#1D9E75' : '#9CA3AF' }}>
            {up != null && (up ? '↑ ' : '↓ ')}{sub}
          </div>
        )}
      </div>
    </div>
  );
}
