import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext.js';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/theme/index.js';
import LandingScreen from '../src/components/landing/LandingScreen.js';

// Mirrors the web app's routing: `/` is the public landing page for logged-out
// visitors (aviqr-ui-web's <Route path="/" element={<Landing />} />); only a
// logged-in user gets redirected straight past it to their role's home.
export default function Index() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && user) router.replace(homeRoute(user.role));
  }, [user, loading]);

  if (loading || user) {
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
  if (r==='CUSTOMER') return '/(customer)/shop/menu';
  return '/(owner)/dashboard';
}