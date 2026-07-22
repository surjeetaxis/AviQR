import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { favoritesApi, loyaltyApi, authApi } from '../../../../src/api/index.js';
import { useAuth } from '../../../../src/context/AuthContext.js';
import { PageHeader } from '../../../../src/components/common/PageHeader.js';
import { Input } from '../../../../src/components/common/Input.js';
import { Button } from '../../../../src/components/common/Button.js';
import { BottomSheet } from '../../../../src/components/common/BottomSheet.js';
import { CustomerBottomNav } from '../../../../src/components/common/CustomerBottomNav.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../../../src/theme/index.js';

const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' }, { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' }, { code: 'kn', label: 'Kannada' }, { code: 'ml', label: 'Malayalam' }, { code: 'bn', label: 'Bengali' },
];

// Profile + Rewards + Favorites in one screen, matching web's PortalProfile.
// Rewards is scoped to the shop the customer arrived from (loyalty is
// tracked per-shop server-side, not a cross-shop point wallet) — the menu
// screen passes its current shopId along when navigating here.
export default function CustomerProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { shopId: currentShopId } = useLocalSearchParams();
  const [loyalty, setLoyalty]       = useState(null);
  const [favorites, setFavorites]   = useState([]);
  const [loadingFav, setLoadingFav] = useState(true);
  const [showEdit, setShowEdit]     = useState(false);
  const [editForm, setEditForm]     = useState({ name: '', preferredLanguage: 'en' });
  const [saving, setSaving]         = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Bottom nav is shared across every customer screen (menu/orders/profile)
  // so it doesn't disappear just because you're not on the menu screen —
  // it previously only rendered on menu.js.
  const handleTabChange = (key) => {
    if (key === 'profile') return; // already here
    if (key === 'orders') return router.push(currentShopId ? { pathname: '/(customer)/shop/orders', params: { shopId: currentShopId } } : '/(customer)/shop/orders');
    router.push(currentShopId ? { pathname: '/(customer)/shop/menu', params: { shopId: currentShopId } } : '/(customer)/shop/menu');
  };

  useEffect(() => {
    if (!user?.phone) { setLoadingFav(false); return; }
    favoritesApi.mine(user.phone).then(res => setFavorites(res.data.data || [])).catch(() => {}).finally(() => setLoadingFav(false));
  }, [user?.phone]);

  useEffect(() => {
    if (!user?.phone || !currentShopId) return;
    loyaltyApi.getBalance(currentShopId, user.phone).then(res => setLoyalty(res.data.data)).catch(() => {});
  }, [user?.phone, currentShopId]);

  const toggleFavorite = (shopId) => {
    favoritesApi.toggle(user.phone, shopId)
      .then(() => setFavorites(prev => prev.filter(f => f.shopId !== shopId)))
      .catch(() => {});
  };

  const openEdit = () => {
    setEditForm({ name: user?.name || '', preferredLanguage: user?.preferredLanguage || 'en' });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile({ name: editForm.name, preferredLanguage: editForm.preferredLanguage });
      updateUser?.(res.data.data);
      setShowEdit(false);
    } catch (e) { Alert.alert('Could not save changes', e.response?.data?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const confirmedDeactivate = async () => {
    setDeactivating(true);
    try { await authApi.deactivateAccount(); logout(); }
    catch { Alert.alert('Could not deactivate account'); setDeactivating(false); }
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <PageHeader title="Profile" />
        <View style={ss.center}>
          <Text style={ss.centerIcon}>🔑</Text>
          <Text style={ss.centerTxt}>Log in to see your profile, rewards, and favorites.</Text>
          <Button title="Log in" onPress={() => router.push('/login')} style={{ marginTop: 16 }} />
        </View>
        <CustomerBottomNav activeTab="profile" onChangeTab={handleTabChange} cartCount={0} pageBackground={Colors.background} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PageHeader title="Profile" />
      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}>
        <View style={ss.identityCard}>
          <View style={ss.avatar}><Text style={{ fontSize: 20 }}>🙋</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={ss.name}>{user.name === 'Guest' ? 'Guest' : user.name}</Text>
            <Text style={ss.phone}>{user.phone}</Text>
          </View>
          <TouchableOpacity onPress={openEdit} style={ss.editBtn}><Text style={{ fontSize: 15 }}>✏️</Text></TouchableOpacity>
        </View>

        <Text style={ss.sectionTitle}>ACCOUNT</Text>
        <TouchableOpacity style={ss.navRow} onPress={() => router.push('/(customer)/shop/orders')}>
          <Text style={ss.navIcon}>📦</Text>
          <Text style={ss.navLabel}>Order History</Text>
          <Text style={ss.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.navRow} onPress={() => router.push('/(customer)/shop/profile/addresses')}>
          <Text style={ss.navIcon}>📍</Text>
          <Text style={ss.navLabel}>Saved Addresses</Text>
          <Text style={ss.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={ss.sectionTitle}>🎁 REWARDS</Text>
        {!currentShopId ? (
          <Text style={ss.hint}>Visit a restaurant to see your rewards there — loyalty points are tracked per restaurant, not as a single wallet.</Text>
        ) : loyalty ? (
          <View style={ss.rewardCard}>
            <Text style={ss.rewardPts}>⭐ {loyalty.totalPoints ?? loyalty.balance ?? 0}</Text>
            <Text style={ss.rewardHint}>points at this restaurant</Text>
          </View>
        ) : <Text style={ss.hint}>Loading…</Text>}

        <Text style={ss.sectionTitle}>❤️ FAVORITES</Text>
        {loadingFav ? <Text style={ss.hint}>Loading…</Text> : favorites.length === 0 ? (
          <Text style={ss.hint}>No favorites yet — tap the heart on a restaurant to save it here.</Text>
        ) : favorites.map(f => (
          <View key={f.shopId} style={ss.favRow}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(customer)/shop/menu', params: { shopId: f.shopId } })}>
              <Text style={ss.favName}>{f.shopName}</Text>
              {f.city && <Text style={ss.favCity}>{f.city}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleFavorite(f.shopId)}><Text style={{ fontSize: 16 }}>❤️</Text></TouchableOpacity>
          </View>
        ))}

        <Button title="🚪 Sign out" onPress={logout} variant="outline" style={{ marginTop: 20 }} />

        {confirmDeactivate ? (
          <View style={ss.deactivateBox}>
            <Text style={ss.deactivateTxt}>Deactivate your account? You'll be signed out and this can't be undone from here.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button title="Cancel" onPress={() => setConfirmDeactivate(false)} variant="ghost" disabled={deactivating} style={{ flex: 1 }} />
              <Button title={deactivating ? 'Deactivating…' : 'Deactivate'} onPress={confirmedDeactivate} variant="danger" loading={deactivating} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setConfirmDeactivate(true)}><Text style={ss.deactivateLink}>Deactivate account</Text></TouchableOpacity>
        )}
      </ScrollView>

      <BottomSheet visible={showEdit} onClose={() => setShowEdit(false)}>
        <Text style={ss.sheetTitle}>Edit Profile</Text>
        <Input label="Name" value={editForm.name} onChangeText={v => setEditForm(f => ({ ...f, name: v }))} />
        <Text style={ss.roleLabel}>Preferred language</Text>
        <View style={ss.langGrid}>
          {LANGUAGES.map(l => (
            <TouchableOpacity key={l.code} style={[ss.langChip, editForm.preferredLanguage === l.code && ss.langChipActive]} onPress={() => setEditForm(f => ({ ...f, preferredLanguage: l.code }))}>
              <Text style={[ss.langChipTxt, editForm.preferredLanguage === l.code && ss.langChipTxtActive]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title={saving ? 'Saving…' : 'Save changes'} onPress={saveEdit} loading={saving} disabled={!editForm.name.trim()} style={{ marginTop: 12 }} />
      </BottomSheet>

      <CustomerBottomNav activeTab="profile" onChangeTab={handleTabChange} cartCount={0} pageBackground={Colors.background} />
    </View>
  );
}

const ss = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 30 },
  centerIcon: { fontSize: 40, marginBottom: 12 },
  centerTxt: { fontSize: FontSize.sm, color: Colors.gray500, textAlign: 'center' },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, marginBottom: 16, ...Shadow.sm },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: FontSize.base, fontWeight: '800', color: Colors.gray900 },
  phone: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  editBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.gray50, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.gray500, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, marginBottom: 8, ...Shadow.sm },
  navIcon: { fontSize: 16 },
  navLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700 },
  chevron: { fontSize: 16, color: Colors.gray300 },
  hint: { fontSize: FontSize.xs, color: Colors.gray400 },
  rewardCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 14, ...Shadow.sm },
  rewardPts: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gray900 },
  rewardHint: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, marginBottom: 8, ...Shadow.sm },
  favName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray900 },
  favCity: { fontSize: 11, color: Colors.gray400, marginTop: 1 },
  deactivateBox: { backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: 14, marginTop: 20, borderWidth: 1, borderColor: '#FECACA' },
  deactivateTxt: { fontSize: FontSize.xs, color: Colors.gray700 },
  deactivateLink: { textAlign: 'center', fontSize: 11, color: Colors.gray400, textDecorationLine: 'underline', marginTop: 20 },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.gray900, marginBottom: 16 },
  roleLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.gray700, marginBottom: 8 },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  langChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  langChipTxt: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray500 },
  langChipTxtActive: { color: Colors.primaryDark },
});
