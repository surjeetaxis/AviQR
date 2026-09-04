import { Tabs } from 'expo-router';
import { HotelTabBar } from '../../src/components/common/HotelTabBar.js';

export default function HotelLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <HotelTabBar {...props} />}
    >
      <Tabs.Screen name="hotel-home"     options={{ title: 'Home' }} />
      <Tabs.Screen name="pms/index"      options={{ title: 'PMS' }} />
      <Tabs.Screen name="guests"         options={{ title: 'Guests' }} />
      <Tabs.Screen name="housekeeping"   options={{ title: 'Housekeeping' }} />
      <Tabs.Screen name="hotel-settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
