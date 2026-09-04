import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { hotelApi, hotelOpsApi } from '../../src/api/index.js';
import { PageHeader } from '../../src/components/common/PageHeader.js';
import { Card } from '../../src/components/common/Card.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/index.js';

export default function MessagesScreen() {
  const [hotelId, setHotelId] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRoom, setOpenRoom] = useState(null);
  const [thread, setThread] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadInbox = useCallback((hId) => {
    hotelOpsApi.messageInbox(hId).then(res => setInbox(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await hotelApi.getMyHotels();
        const hotel = (hRes.data.data || [])[0];
        if (!hotel) return;
        setHotelId(hotel.id);
        loadInbox(hotel.id);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [loadInbox]);

  const openThread = (room) => {
    setOpenRoom(room);
    hotelOpsApi.messageThread(hotelId, room).then(res => { setThread(res.data.data || []); loadInbox(hotelId); }).catch(() => {});
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await hotelOpsApi.replyToRoom(hotelId, openRoom, { message: reply });
      setReply('');
      openThread(openRoom);
    } catch { Alert.alert('Could not send reply'); }
    finally { setSending(false); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Messages" />
      <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Messages" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.sub}>Two-way messages with guests, by room.</Text>

        {inbox.map(m => (
          <TouchableOpacity key={m.id} onPress={() => openThread(m.roomNumber)}>
            <Card style={[ss.inboxCard, openRoom === m.roomNumber && ss.inboxCardActive]}>
              <View style={{ flex: 1 }}>
                <Text style={ss.roomLabel}>Room {m.roomNumber} <Text style={ss.fromLabel}>· {m.sender === 'GUEST' ? (m.guestName || 'Guest') : 'Front Desk'}</Text></Text>
                <Text style={ss.lastMsg} numberOfLines={1}>{m.message}</Text>
              </View>
              <Text style={ss.whenTxt}>{new Date(m.createdAt).toLocaleDateString()}</Text>
            </Card>
          </TouchableOpacity>
        ))}
        {inbox.length === 0 && <Text style={ss.emptyTxt}>No messages yet.</Text>}

        {openRoom && (
          <Card style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={ss.cardTitle}>Room {openRoom}</Text>
              <TouchableOpacity onPress={() => setOpenRoom(null)}><Text style={ss.closeTxt}>✕ Close</Text></TouchableOpacity>
            </View>
            <View style={{ gap: 8, marginBottom: 12 }}>
              {thread.map(m => (
                <View key={m.id} style={{ alignItems: m.sender === 'STAFF' ? 'flex-end' : 'flex-start' }}>
                  <View style={[ss.bubble, { backgroundColor: m.sender === 'STAFF' ? Colors.primary : Colors.gray100 }]}>
                    <Text style={{ color: m.sender === 'STAFF' ? Colors.white : Colors.gray900, fontSize: FontSize.sm }}>{m.message}</Text>
                  </View>
                  <Text style={ss.bubbleTime}>{new Date(m.createdAt).toLocaleString()}</Text>
                </View>
              ))}
              {thread.length === 0 && <Text style={ss.emptyTxt}>No messages in this thread yet.</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <Input placeholder="Type a reply…" value={reply} onChangeText={setReply} style={{ flex: 1, marginBottom: 0 }} />
              <Button title={sending ? '…' : 'Send'} size="sm" loading={sending} onPress={sendReply} />
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  sub: { fontSize: FontSize.sm, color: Colors.gray500, marginBottom: 14 },
  cardTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  inboxCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inboxCardActive: { borderWidth: 1.5, borderColor: Colors.primary },
  roomLabel: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.gray900 },
  fromLabel: { fontWeight: '500', color: Colors.gray500 },
  lastMsg: { fontSize: FontSize.xs, color: Colors.gray600, marginTop: 2 },
  whenTxt: { fontSize: 10, color: Colors.gray400 },
  closeTxt: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.gray500 },
  bubble: { maxWidth: '80%', borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleTime: { fontSize: 10, color: Colors.gray400, marginTop: 2 },
  emptyTxt: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
});
