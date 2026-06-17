import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme/index.js';
export default function OwnerLayout() {
  return (
    <Tabs screenOptions={{
      headerShown:false,
      tabBarActiveTintColor:Colors.primary,
      tabBarInactiveTintColor:Colors.gray400,
      tabBarStyle:{height:60,paddingBottom:8,backgroundColor:Colors.white,borderTopColor:Colors.border},
      tabBarLabelStyle:{fontSize:11,fontWeight:'600'},
    }}>
      <Tabs.Screen name="dashboard" options={{title:'Home',      tabBarIcon:({color})=><TabIcon emoji="🏠" color={color}/>}}/>
      <Tabs.Screen name="orders"    options={{title:'Orders',    tabBarIcon:({color})=><TabIcon emoji="📦" color={color}/>}}/>
      <Tabs.Screen name="menu"      options={{title:'Menu',      tabBarIcon:({color})=><TabIcon emoji="🍽️" color={color}/>}}/>
      <Tabs.Screen name="reports"   options={{title:'Reports',   tabBarIcon:({color})=><TabIcon emoji="📊" color={color}/>}}/>
      <Tabs.Screen name="settings"  options={{title:'Settings',  tabBarIcon:({color})=><TabIcon emoji="⚙️" color={color}/>}}/>
    </Tabs>
  );
}
function TabIcon({emoji,color}){
  const {Text}=require('react-native');
  return <Text style={{fontSize:20,opacity:color===Colors.primary?1:0.5}}>{emoji}</Text>;
}