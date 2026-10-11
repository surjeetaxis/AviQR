import { RoleGate } from '../../src/components/common/RoleGate.js';
import { Colors } from '../../src/theme/index.js';
import { Tabs } from 'expo-router';
import { HotelTabBar } from '../../src/components/common/HotelTabBar.js';

export default function HotelLayout() {
  return (
    <RoleGate allowed={["HOTEL", "ADMIN"]}><Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}
      tabBar={props => <HotelTabBar {...props} />}
    >
      <Tabs.Screen name="hotel-home"     options={{ title: 'Home' }} />
      <Tabs.Screen name="pms/index"      options={{ title: 'PMS' }} />
      <Tabs.Screen name="guests"         options={{ title: 'Guests' }} />
      <Tabs.Screen name="housekeeping"   options={{ title: 'Housekeeping' }} />
      <Tabs.Screen name="hotel-settings" options={{ title: 'Settings' }} />
    </Tabs></RoleGate>
  );
}
