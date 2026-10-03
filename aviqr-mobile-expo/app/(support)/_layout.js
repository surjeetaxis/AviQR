import { RoleGate } from '../../src/components/common/RoleGate.js';
import { Stack } from 'expo-router';
export default function SupportLayout() {
  return <RoleGate allowed={["SUPPORT", "ADMIN"]}><Stack screenOptions={{ headerShown: false }} /></RoleGate>;
}
