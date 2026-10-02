import { Stack, Redirect } from 'expo-router';
import { useAuth, ROLE_HOME } from '../../src/context/AuthContext.js';
export default function AdminLayout() {
  const {user,loading}=useAuth();
  if(loading) return null;
  if(!user) return <Redirect href="/login"/>;
  if((user.role||'').toUpperCase()!=='ADMIN') return <Redirect href={ROLE_HOME[(user.role||'').toUpperCase()]||'/login'}/>;
  return <Stack screenOptions={{headerShown:false}}/>;
}
