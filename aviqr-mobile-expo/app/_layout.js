import { Stack, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/theme/index.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import useScreenViews from '../src/hooks/useAnalytics.js';

export default function RootLayout() {
  useScreenViews();
  const segments = useSegments();
  const screen = segments.at(-1) || '';
  const onBrand = ['login','forgot-password','landing','dashboard','admin-home','support-home','hotel-home','mall-home','supplier-home'].includes(screen);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style={onBrand ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false, contentStyle:{backgroundColor:Colors.background} }} />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
