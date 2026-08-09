import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext.js';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/theme/index.js';
import { tokenStorage } from '../src/api/tokenStorage.js';
import LandingScreen from '../src/components/landing/LandingScreen.js';

// `/` is the app's smart entry point. A logged-in user skips straight to
// their role's home. A logged-out user sees the marketing Landing page only
// the very first time this device is used; once it has signed in/up before
// (aviqr_has_authenticated, set in AuthContext.saveSession — sticks around
// after logout), later opens go straight to Login instead. Landing stays
// reachable any time via the logo on Login (see app/landing.js).
export default function Index() {
  const { user, loading } = useAuth();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) { router.replace(homeRoute(user.role)); return; }
    (async () => {
      const seenBefore = await tokenStorage.get('aviqr_has_authenticated');
      if (seenBefore) router.replace('/login');
      else setShowLanding(true);
    })();
  }, [user, loading]);

  if (!showLanding) {
    return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:Colors.background}}>
      <ActivityIndicator size="large" color={Colors.primary}/>
    </View>;
  }
  return <LandingScreen />;
}
function homeRoute(role) {
  const r = (role||'').toUpperCase();
  if (r==='ADMIN')    return '/(admin)/admin-home';
  if (r==='SUPPORT')  return '/(support)/support-home';
  if (r==='HOTEL')    return '/(hotel)/hotel-home';
  if (r==='MALL')     return '/(mall)/mall-home';
  if (r==='SUPPLIER') return '/(supplier)/supplier-home';
  // A direct app open (no QR-scan context) lands on the nearby-shops list;
  // a QR-scan deep link (e.g. aviqr://shop/menu?shopId=...) routes straight
  // to that shop's menu on its own, without ever passing through here.
  if (r==='CUSTOMER') return '/(customer)/portal-home';
  return '/(owner)/dashboard';
}