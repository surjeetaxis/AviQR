import { Tabs } from 'expo-router';
import { OwnerTabBar } from '../../src/components/common/OwnerTabBar.js';

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <OwnerTabBar {...props} />}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
      <Tabs.Screen name="orders"    options={{ title: 'Orders' }} />
      <Tabs.Screen name="menu"      options={{ title: 'Menu' }} />
      <Tabs.Screen name="reports"   options={{ title: 'Reports' }} />
      <Tabs.Screen name="settings"  options={{ title: 'Settings' }} />
    </Tabs>
  );
}
