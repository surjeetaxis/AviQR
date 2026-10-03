import { Redirect } from 'expo-router';
import { useAuth, ROLE_HOME } from '../../context/AuthContext.js';
import { LoadingScreen } from './LoadingScreen.js';

export function RoleGate({ allowed, children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect href="/login" />;
  const role = (user.role || '').toUpperCase();
  if (!allowed.includes(role)) return <Redirect href={ROLE_HOME[role] || '/login'} />;
  return children;
}
