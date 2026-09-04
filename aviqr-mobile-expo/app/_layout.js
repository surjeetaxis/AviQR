import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext.js';
import useScreenViews from '../src/hooks/useAnalytics.js';

export default function RootLayout() {
  useScreenViews();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
