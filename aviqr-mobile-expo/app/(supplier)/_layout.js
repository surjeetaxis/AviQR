import { RoleGate } from '../../src/components/common/RoleGate.js';
import { Stack } from 'expo-router';
export default function SupplierLayout() {
  return <RoleGate allowed={["SUPPLIER", "ADMIN"]}><Stack screenOptions={{ headerShown: false }} /></RoleGate>;
}
