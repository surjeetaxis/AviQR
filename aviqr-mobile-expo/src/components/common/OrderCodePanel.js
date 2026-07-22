import { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { BASE_URL } from '../../api/index.js';
import { tokenStorage } from '../../api/tokenStorage.js';
import { Colors, FontSize, Radius } from '../../theme/index.js';

// Mirrors web's shared/OrderCodePanel.jsx — the counter-pickup code + QR shown
// while an order is in flight. Web fetches the image as an authenticated blob;
// here we pass the token via Image's `headers` (RN's native image loader
// supports per-request headers), falling back to no header for guest orders
// (the backend only enforces ownership when a CUSTOMER-role token is present).
export function OrderCodePanel({ order }) {
  const [token, setToken] = useState(null);

  useEffect(() => { tokenStorage.get('aviqr_token').then(setToken).catch(() => {}); }, []);

  if (!order?.confirmationCode) return null;
  const cancelled = order.status === 'CANCELLED' || order.status === 'REJECTED';
  if (cancelled || order.status === 'COMPLETED') return null;

  const instruction = order.status === 'PENDING_PAYMENT'
    ? 'Show this code at the counter to pay and start your order'
    : order.status === 'READY'
    ? 'Show this code at the counter to collect your order'
    : "Keep this code — you'll need it to collect your order";

  return (
    <View style={ss.panel}>
      <Image
        source={{ uri: `${BASE_URL}/api/v1/orders/${order.id}/code-image`, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
        style={ss.qrImage}
      />
      <Text style={ss.code}>{order.confirmationCode}</Text>
      <Text style={ss.instruction}>{instruction}</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  panel: { alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#D97706', borderStyle: 'dashed', borderRadius: Radius.xl, padding: 18, width: '100%' },
  qrImage: { width: 140, height: 140, borderRadius: 8, backgroundColor: Colors.white },
  code: { fontSize: 28, fontWeight: '900', letterSpacing: 6, color: '#92400E', fontFamily: 'monospace' },
  instruction: { fontSize: FontSize.sm, color: '#92400E', textAlign: 'center', lineHeight: 18 },
});
