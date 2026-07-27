import { Check, X, ShieldAlert } from 'lucide-react';
import { OWNER_TREE_SCREENS, OWNER_TREE_ROLES, ownerTreeHasAccess, PLATFORM_DASHBOARDS } from '../../data/permissionMatrix.js';

// Read-only reference screen: which roles can access which screens. Sourced
// live from ROLE_PERMISSIONS / App.jsx's route guards (permissionMatrix.js),
// not a hand-maintained copy — used identically from AdminDashboard and
// SupportDashboard, both purely for reference (nothing here is editable; the
// actual gating lives in App.jsx's route guards).
export default function PermissionMatrixView() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Permissions</h1>
          <p className="page-subtitle">Which roles can access which screens — read-only reference, sourced live from the app's route guards.</p>
        </div>
      </div>

      <div className="admin-chart-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 4 }}>Shop dashboard (owner-tree) screens</h3>
        <p style={{ fontSize: 12.5, color: 'var(--gray-500)', marginBottom: 14 }}>OWNER has unrestricted access; every other role below is an explicit allow-list.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={sx.table}>
            <thead>
              <tr>
                <th style={sx.thScreen}>Screen</th>
                {OWNER_TREE_ROLES.map(role => <th key={role} style={sx.th}>{role}</th>)}
              </tr>
            </thead>
            <tbody>
              {OWNER_TREE_SCREENS.map(([path, label]) => (
                <tr key={path}>
                  <td style={sx.tdScreen}>{label}</td>
                  {OWNER_TREE_ROLES.map(role => (
                    <td key={role} style={sx.td}>
                      {ownerTreeHasAccess(role, path)
                        ? <Check size={15} color="#10b981" />
                        : <X size={13} color="#D1D5DB" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-chart-card">
        <h3 style={{ marginBottom: 4 }}>Platform dashboards</h3>
        <p style={{ fontSize: 12.5, color: 'var(--gray-500)', marginBottom: 14 }}>Each is a separate app with its own route guard — not part of the owner-tree permissions above.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={sx.table}>
            <thead>
              <tr>
                <th style={sx.thScreen}>Dashboard</th>
                <th style={sx.th}>Route</th>
                <th style={sx.th}>Primary role</th>
                <th style={sx.th}>Guard</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_DASHBOARDS.map(d => (
                <tr key={d.route}>
                  <td style={sx.tdScreen}>{d.dashboard}</td>
                  <td style={{ ...sx.td, fontFamily: 'monospace', fontSize: 12 }}>{d.route}</td>
                  <td style={sx.td}>{d.primaryRole}</td>
                  <td style={{ ...sx.td, color: d.guard.startsWith('⚠') ? '#B45309' : 'var(--gray-700)', fontWeight: d.guard.startsWith('⚠') ? 600 : 400 }}>
                    {d.guard.startsWith('⚠') && <ShieldAlert size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}
                    {d.guard.replace('⚠ ', '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const sx = {
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 640 },
  th: { textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--gray-500)', padding: '8px 10px', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap' },
  thScreen: { textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: 'var(--gray-500)', padding: '8px 10px', borderBottom: '1px solid var(--gray-200)' },
  td: { textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid var(--gray-100)', fontSize: 13 },
  tdScreen: { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--gray-100)', fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', whiteSpace: 'nowrap' },
};
