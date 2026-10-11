import { Stack } from 'expo-router';
import { RoleGate } from '../../src/components/common/RoleGate.js';
export default function AdminLayout() {
  return <RoleGate allowed={["ADMIN"]}><Stack screenOptions={{headerShown:false}}/></RoleGate>;
}
