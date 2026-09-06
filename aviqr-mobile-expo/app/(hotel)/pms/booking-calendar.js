import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { hotelApi, pmsApi } from '../../../src/api/index.js';
import { PageHeader } from '../../../src/components/common/PageHeader.js';
import { Colors, FontSize, Spacing, Radius } from '../../../src/theme/index.js';

const RANGE_DAYS = 14;
const ROOM_COL_WIDTH = 90;
const DAY_COL_WIDTH = 40;
const ROW_HEIGHT = 40;

// Matches StatusBadge's dot colors so a room's cell color means the same thing
// everywhere in the app.
const STATUS_COLORS = {
  BOOKED: '#2563EB', CHECKED_IN: '#1D9E75', CHECKED_OUT: '#9CA3AF', NO_SHOW: '#DC2626',
};
const LEGEND = [
  { status: 'BOOKED', label: 'Booked' },
  { status: 'CHECKED_IN', label: 'Checked in' },
  { status: 'CHECKED_OUT', label: 'Checked out' },
  { status: 'NO_SHOW', label: 'No-show' },
];

const toISO = (d) => d.toISOString().slice(0, 10);
const today = () => toISO(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d); };
const shortDay = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return { dow: d.toLocaleDateString('en-IN', { weekday: 'short' }), dom: d.getDate() };
};

// A room's occupancy on a date is shown as a single colored cell (rather than a
// spanning bar) — small mobile column widths make continuous drag-drawn bars
// impractical, so each day's status is its own tap target; tapping shows the
// stay's details, mirroring the desktop tape-chart's click-to-popover.
//
// Room type groups are collapsible, each with an inventory roll-up strip (sellable
// rooms per date) above its individual room rows — mirrors the web tape-chart's
// availability header row (see BookingCalendarController.buildAvailability() on the
// backend: physical room count minus rooms held that night, capped by any
// manager-set allotment).
export default function BookingCalendarScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [rangeStart, setRangeStart] = useState(today());
  const [rooms, setRooms] = useState([]);
  const [stays, setStays] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [collapsed, setCollapsed] = useState({}); // roomTypeId -> true when collapsed
  const [loading, setLoading] = useState(true);

  const dates = Array.from({ length: RANGE_DAYS }, (_, i) => addDays(rangeStart, i));

  const load = useCallback(async (hId, from) => {
    const res = await pmsApi.bookingCalendar(hId, from, addDays(from, RANGE_DAYS));
    const data = res.data.data || {};
    setRooms(data.rooms || []);
    setStays(data.stays || []);
    setAvailability(data.roomTypeAvailability || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        await load(hotel.id, rangeStart);
      } catch {}
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shiftRange = async (days) => {
    const next = addDays(rangeStart, days);
    setRangeStart(next);
    setLoading(true);
    try { await load(hotelId, next); } catch {}
    finally { setLoading(false); }
  };

  const goToday = async () => {
    setRangeStart(today());
    setLoading(true);
    try { await load(hotelId, today()); } catch {}
    finally { setLoading(false); }
  };

  const stayFor = (roomId, date) => stays.find(s => s.roomId === roomId && date >= s.checkInDate && date < s.checkOutDate);

  const tapCell = (room, date) => {
    const s = stayFor(room.roomId, date);
    if (!s) return Alert.alert(`${room.roomNumber} — ${date}`, 'No booking.');
    Alert.alert(`${room.roomNumber} — ${s.guestName}`, `${s.status.replace('_', ' ')}\n${s.checkInDate} → ${s.checkOutDate}`);
  };

  const toggleGroup = (roomTypeId) => setCollapsed(p => ({ ...p, [roomTypeId]: !p[roomTypeId] }));

  const groups = [];
  rooms.forEach(r => {
    let g = groups.find(x => x.roomTypeId === r.roomTypeId);
    if (!g) { g = { roomTypeId: r.roomTypeId, roomType: r.roomType, rooms: [] }; groups.push(g); }
    g.rooms.push(r);
  });
  const availabilityByType = {};
  availability.forEach(a => {
    const byDate = {};
    (a.byDate || []).forEach(d => { byDate[d.date] = d.available; });
    availabilityByType[a.roomTypeId] = byDate;
  });

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Booking Calendar" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Booking Calendar" />

      <View style={ss.nav}>
        <TouchableOpacity onPress={() => shiftRange(-RANGE_DAYS)} style={ss.navBtn}><Text style={ss.navBtnTxt}>‹ Prev</Text></TouchableOpacity>
        <TouchableOpacity onPress={goToday} style={ss.navBtn}><Text style={ss.navBtnTxt}>Today</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => shiftRange(RANGE_DAYS)} style={ss.navBtn}><Text style={ss.navBtnTxt}>Next ›</Text></TouchableOpacity>
      </View>

      <View style={ss.legendRow}>
        {LEGEND.map(l => (
          <View key={l.status} style={ss.legendItem}>
            <View style={[ss.legendDot, { backgroundColor: STATUS_COLORS[l.status] }]} />
            <Text style={ss.legendTxt}>{l.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row' }}>
          {/* Frozen left column: room-type headers + room numbers, in the same
              top-to-bottom order as the scrollable date grid on the right, so the
              two stay visually aligned even though only the right side scrolls
              horizontally (a single shared ScrollView, not one per group — nesting
              a horizontal ScrollView per group would let each scroll independently
              and drift out of sync with the date header). */}
          <View style={{ width: ROOM_COL_WIDTH }}>
            <View style={[ss.headerCell, { width: ROOM_COL_WIDTH }]}><Text style={ss.headerTxt}>Room</Text></View>
            {groups.map(g => {
              const isCollapsed = !!collapsed[g.roomTypeId];
              return (
                <View key={g.roomTypeId || g.roomType}>
                  <TouchableOpacity onPress={() => toggleGroup(g.roomTypeId)} style={[ss.groupHeaderCell, { width: ROOM_COL_WIDTH }]}>
                    <Text style={ss.groupChevron}>{isCollapsed ? '›' : '⌄'}</Text>
                    <Text style={ss.groupTitle} numberOfLines={1}>{g.roomType} ({g.rooms.length})</Text>
                  </TouchableOpacity>
                  {!isCollapsed && g.rooms.map(r => (
                    <View key={r.roomId} style={[ss.roomCell, { width: ROOM_COL_WIDTH }]}>
                      <Text style={ss.roomNumber} numberOfLines={1}>{r.roomNumber}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={{ flexDirection: 'row' }}>
                {dates.map(date => {
                  const { dow, dom } = shortDay(date);
                  return (
                    <View key={date} style={[ss.dateHeaderCell, { width: DAY_COL_WIDTH }]}>
                      <Text style={ss.dateHeaderDow}>{dow}</Text>
                      <Text style={ss.dateHeaderDom}>{dom}</Text>
                    </View>
                  );
                })}
              </View>

              {groups.map(g => {
                const byDate = availabilityByType[g.roomTypeId] || {};
                const isCollapsed = !!collapsed[g.roomTypeId];
                return (
                  <View key={g.roomTypeId || g.roomType}>
                    <TouchableOpacity onPress={() => toggleGroup(g.roomTypeId)} style={{ flexDirection: 'row' }}>
                      {dates.map(date => {
                        const n = byDate[date];
                        return (
                          <View key={date} style={[ss.availCell, { width: DAY_COL_WIDTH }]}>
                            <Text style={[ss.availTxt, { color: n === undefined ? Colors.gray300 : n > 0 ? '#16a34a' : '#dc2626' }]}>{n ?? '—'}</Text>
                          </View>
                        );
                      })}
                    </TouchableOpacity>

                    {!isCollapsed && g.rooms.map(r => (
                      <View key={r.roomId} style={{ flexDirection: 'row' }}>
                        {dates.map(date => {
                          const s = stayFor(r.roomId, date);
                          return (
                            <TouchableOpacity key={date} onPress={() => tapCell(r, date)}
                              style={[ss.dayCell, { width: DAY_COL_WIDTH }, s && { backgroundColor: STATUS_COLORS[s.status] || Colors.gray300 }]}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {rooms.length === 0 && <Text style={ss.emptyTxt}>No rooms found.</Text>}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  nav: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.base, paddingTop: 10 },
  navBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  navBtnTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray700 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: Spacing.base, paddingVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 10, color: Colors.gray500 },
  headerCell: { height: ROW_HEIGHT, justifyContent: 'center', paddingLeft: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTxt: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.gray500 },
  groupHeaderCell: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: Spacing.base, paddingRight: 4, backgroundColor: Colors.gray50 || '#F9FAFB', borderBottomWidth: 1, borderBottomColor: Colors.border },
  groupChevron: { fontSize: FontSize.sm, color: Colors.gray500, width: 12 },
  groupTitle: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.gray900, flexShrink: 1 },
  availCell: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gray50 || '#F9FAFB', borderBottomWidth: 1, borderBottomColor: Colors.border, borderLeftWidth: 1, borderLeftColor: Colors.border },
  availTxt: { fontSize: FontSize.xs, fontWeight: '800' },
  roomCell: { height: ROW_HEIGHT, justifyContent: 'center', paddingLeft: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  roomNumber: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray900 },
  dateHeaderCell: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, borderLeftWidth: 1, borderLeftColor: Colors.border },
  dateHeaderDow: { fontSize: 9, color: Colors.gray400, fontWeight: '600' },
  dateHeaderDom: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.gray900 },
  dayCell: { height: ROW_HEIGHT, borderBottomWidth: 1, borderBottomColor: Colors.border, borderLeftWidth: 1, borderLeftColor: Colors.border, backgroundColor: Colors.white },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 20 },
});
