import { RoleGate } from '../../src/components/common/RoleGate.js';
import { Stack } from 'expo-router';
export default function MallLayout() {
  return <RoleGate allowed={["MALL", "ADMIN"]}><Stack screenOptions={{ headerShown: false }} /></RoleGate>;
}
