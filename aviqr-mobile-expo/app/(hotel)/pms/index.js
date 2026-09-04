import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Card } from '../../../src/components/common/Card.js';
import { Colors, FontSize, Spacing } from '../../../src/theme/index.js';

// Landing screen for the "PMS" bottom-nav tab — a launcher into the PMS
// sub-screens, same set/order as the PMS entries in hotel-home.js's
// NAV_ITEMS grid.
const PMS_ITEMS = [
  { icon: '📅', label: 'Reservations',   sub: 'Bookings & availability', href: '/(hotel)/pms/reservations' },
  { icon: '🛎️', label: 'Front Desk',     sub: 'Check-in / check-out',    href: '/(hotel)/pms/front-desk' },
  { icon: '🧾', label: 'Folio',          sub: 'Guest charges & billing', href: '/(hotel)/pms/folio' },
  { icon: '🛏️', label: 'Room Types',     sub: 'Types & rate plans',      href: '/(hotel)/pms/room-types' },
  { icon: '👨‍👩‍👧', label: 'Group Bookings', sub: 'Block reservations',      href: '/(hotel)/pms/group-bookings' },
  { icon: '🌐', label: 'Channel Manager',sub: 'OTA connections',         href: '/(hotel)/pms/channel-manager' },
  { icon: '🏨', label: 'Chain Templates',sub: 'Push rates to properties',href: '/(hotel)/pms/chain-templates' },
  { icon: '🧳', label: 'Agents',         sub: 'Travel agents',           href: '/(hotel)/pms/agents' },
  { icon: '🎁', label: 'Extras',         sub: 'Add-ons & packages',      href: '/(hotel)/pms/extras' },
  { icon: '📇', label: 'PMS Guests',     sub: 'Guest profiles',          href: '/(hotel)/pms/guests' },
  { icon: '📈', label: 'PMS Reports',    sub: 'Occupancy & revenue',     href: '/(hotel)/pms/pms-reports' },
];

export default function PmsHubScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="PMS" showBack={false} />
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {PMS_ITEMS.map(item => (
          <TouchableOpacity key={item.href} activeOpacity={0.8} onPress={() => router.push(item.href)}>
            <Card style={styles.row}>
              <Text style={styles.icon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.sub}>{item.sub}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  list:    { padding: Spacing.base, gap: 10, paddingBottom: 32 },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon:    { fontSize: 24 },
  label:   { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  sub:     { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.gray400 },
});
