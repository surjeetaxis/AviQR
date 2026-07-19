import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { PageHeader } from '../src/components/common/PageHeader.js';
import { Input } from '../src/components/common/Input.js';
import { Button } from '../src/components/common/Button.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../src/theme/index.js';

const CHANNELS = [
  { emoji: '✉️', title: 'Support', desc: 'Product questions, bugs, account help', value: 'support@aviqr.in', href: 'mailto:support@aviqr.in' },
  { emoji: '📞', title: 'Call us', desc: 'Mon–Sat, 9 AM – 8 PM IST', value: '+91 98450 00000', href: 'tel:+919845000000' },
  { emoji: '📍', title: 'Office', desc: 'Registered address', value: 'Bengaluru, Karnataka – 560001', href: null },
];

export default function ContactScreen() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const send = async () => {
    if (!form.name || !form.email || !form.message) return Alert.alert('Required', 'Please fill in name, email and message.');
    const subject = encodeURIComponent(`Website enquiry from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    const url = `mailto:support@aviqr.in?subject=${subject}&body=${body}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert('No email app found', 'Please email support@aviqr.in directly.');
    } catch { Alert.alert('Could not open email app'); }
  };

  return (
    <View style={ss.screen}>
      <PageHeader title="Contact" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 40 }}>
        <Text style={ss.eyebrow}>CONTACT</Text>
        <Text style={ss.h1}>Talk to us</Text>
        <Text style={ss.sub}>Questions about a plan, a bug to report, or a partnership to discuss — here's how to reach the team directly.</Text>

        {CHANNELS.map(c => (
          <TouchableOpacity key={c.title} style={ss.channel} disabled={!c.href} onPress={() => c.href && Linking.openURL(c.href)}>
            <Text style={ss.channelEmoji}>{c.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ss.channelTitle}>{c.title}</Text>
              <Text style={ss.channelDesc}>{c.desc}</Text>
              <Text style={[ss.channelValue, c.href && { color: Colors.primary }]}>{c.value}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={ss.h2}>Send a message</Text>
        <Input label="Name" placeholder="Your name" value={form.name} onChangeText={v => set('name', v)} />
        <Input label="Email" placeholder="you@business.com" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Message" placeholder="How can we help?" value={form.message} onChangeText={v => set('message', v)} multiline style={{ minHeight: 90 }} />
        <Button title="Send message" onPress={send} style={{ marginTop: 8 }} />
        <Text style={ss.note}>Opens your email app addressed to support@aviqr.in — we typically reply within 2 hours during business hours.</Text>

        <View style={ss.grievance}>
          <Text style={ss.grievanceEmoji}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={ss.channelTitle}>Grievance Officer</Text>
            <Text style={ss.channelDesc}>For DPDP Act / IT Rules grievances that aren't resolved by support, escalate to <Text style={{ color: Colors.primary, fontWeight: '700' }} onPress={() => Linking.openURL('mailto:grievance@aviqr.in')}>grievance@aviqr.in</Text> — response within 30 days.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  eyebrow: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8 },
  h1: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900, marginTop: 4, marginBottom: 8 },
  h2: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900, marginTop: 24, marginBottom: 12 },
  sub: { fontSize: FontSize.sm, color: Colors.gray600, lineHeight: 21, marginBottom: 20 },
  channel: { flexDirection: 'row', gap: 12, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, marginBottom: 10, ...Shadow.sm },
  channelEmoji: { fontSize: 22 },
  channelTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.gray900 },
  channelDesc: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2, lineHeight: 17 },
  channelValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray700, marginTop: 4 },
  note: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 8, lineHeight: 16 },
  grievance: { flexDirection: 'row', gap: 12, backgroundColor: Colors.warningLight, borderRadius: Radius.md, padding: 14, marginTop: 20, borderWidth: 1, borderColor: '#FCD34D' },
  grievanceEmoji: { fontSize: 20 },
});
