import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { OWNER_TREE_SCREENS, OWNER_TREE_ROLES, ownerTreeHasAccess, PLATFORM_DASHBOARDS } from '../../data/permissionMatrix.js';
import { Colors, FontSize, Radius, Shadow } from '../../theme/index.js';

// Read-only reference — which roles can access which screens, sourced from
// src/data/permissionMatrix.js (mirrors web's ROLE_PERMISSIONS). Used
// identically from admin-permissions.js and support-permissions.js.
export function PermissionMatrixView() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={ss.card}>
        <Text style={ss.cardTitle}>Shop dashboard (owner-tree) screens</Text>
        <Text style={ss.cardSub}>OWNER has unrestricted access; every other role is an explicit allow-list.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={ss.row}>
              <Text style={[ss.cellHead, ss.screenCol]}>Screen</Text>
              {OWNER_TREE_ROLES.map(role => (
                <Text key={role} style={[ss.cellHead, ss.roleCol]}>{role}</Text>
              ))}
            </View>
            {OWNER_TREE_SCREENS.map(([path, label]) => (
              <View key={path} style={ss.row}>
                <Text style={[ss.cellScreen, ss.screenCol]} numberOfLines={1}>{label}</Text>
                {OWNER_TREE_ROLES.map(role => (
                  <Text key={role} style={[ss.cell, ss.roleCol]}>
                    {ownerTreeHasAccess(role, path) ? '✅' : '·'}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={ss.card}>
        <Text style={ss.cardTitle}>Platform dashboards</Text>
        <Text style={ss.cardSub}>Each is reached via role-based redirect after login (ROLE_HOME) plus backend 403s — mobile has no per-screen route guard of its own.</Text>
        {PLATFORM_DASHBOARDS.map(d => (
          <View key={d.route} style={ss.dashRow}>
            <View style={{ flex: 1 }}>
              <Text style={ss.dashName}>{d.dashboard}</Text>
              <Text style={ss.dashRoute}>{d.route}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={ss.dashRole}>{d.primaryRole}</Text>
              <Text style={ss.dashGuard}>{d.guard}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 14, ...Shadow.sm },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900, marginBottom: 2 },
  cardSub: { fontSize: FontSize.xs, color: Colors.gray500, marginBottom: 12, lineHeight: 16 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  cellHead: { fontSize: 10.5, fontWeight: '700', color: Colors.gray500, paddingVertical: 8, textAlign: 'center' },
  cellScreen: { fontSize: 12.5, fontWeight: '600', color: Colors.gray900, paddingVertical: 8, textAlign: 'left' },
  cell: { fontSize: 12.5, paddingVertical: 8, textAlign: 'center' },
  screenCol: { width: 130, textAlign: 'left', paddingRight: 6 },
  roleCol: { width: 76 },
  dashRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
  dashName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  dashRoute: { fontSize: 11, color: Colors.gray400, marginTop: 2, fontFamily: 'monospace' },
  dashRole: { fontSize: 11.5, fontWeight: '600', color: Colors.gray700 },
  dashGuard: { fontSize: 10.5, color: Colors.gray500, marginTop: 2, textAlign: 'right', maxWidth: 160 },
});
