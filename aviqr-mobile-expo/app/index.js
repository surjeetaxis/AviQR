import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext.js';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../src/theme/index.js';
export default function Index() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading) {
      if (user) router.replace(homeRoute(user.role));
      else router.replace('/login');
    }
  }, [user, loading]);
  return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:Colors.background}}>
    <ActivityIndicator size="large" color={Colors.primary}/>
  </View>;
}
function homeRoute(role) {
  const r = (role||'').toUpperCase();
  if (r==='ADMIN')    return '/(admin)/home';
  if (r==='SUPPORT')  return '/(support)/home';
  if (r==='HOTEL')    return '/(hotel)/home';
  if (r==='MALL')     return '/(mall)/home';
  if (r==='SUPPLIER') return '/(supplier)/home';
  if (r==='CUSTOMER') return '/(customer)/menu';
  return '/(owner)/dashboard';
}