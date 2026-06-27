const TIER_CFG = {
  GOLD:   { label: '🥇 Gold',   bg: '#FEF3C7', fg: '#92400E' },
  SILVER: { label: '🥈 Silver', bg: '#F1F5F9', fg: '#475569' },
  BRONZE: { label: '🥉 Bronze', bg: '#FFEDD5', fg: '#9A3412' },
  NEW:    { label: '✨ New',    bg: '#E0F2FE', fg: '#0369A1' },
};

export default function TierBadge({ tier }) {
  const cfg = TIER_CFG[tier] || TIER_CFG.NEW;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
      background: cfg.bg, color: cfg.fg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}
