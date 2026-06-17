import { View, Text, StyleSheet } from 'react-native';
import { Radius } from '../../theme/index.js';
const MAP = {
  NEW:       {bg:'#EFF6FF',text:'#2563EB',dot:'#2563EB',label:'New'},
  ACCEPTED:  {bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Accepted'},
  PREPARING: {bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Preparing'},
  READY:     {bg:'#ECFDF5',text:'#065F46',dot:'#059669',label:'Ready'},
  COMPLETED: {bg:'#F3F4F6',text:'#6B7280',dot:'#9CA3AF',label:'Done'},
  CANCELLED: {bg:'#FEE2E2',text:'#DC2626',dot:'#DC2626',label:'Cancelled'},
  ACTIVE:    {bg:'#E1F5EE',text:'#0F6E56',dot:'#1D9E75',label:'Active'},
  INACTIVE:  {bg:'#F3F4F6',text:'#6B7280',dot:'#9CA3AF',label:'Inactive'},
  SUSPENDED: {bg:'#FEE2E2',text:'#DC2626',dot:'#DC2626',label:'Suspended'},
  OPEN:      {bg:'#EFF6FF',text:'#2563EB',dot:'#2563EB',label:'Open'},
  PENDING:   {bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Pending'},
  RESOLVED:  {bg:'#E1F5EE',text:'#0F6E56',dot:'#1D9E75',label:'Resolved'},
  OCCUPIED:  {bg:'#E1F5EE',text:'#0F6E56',dot:'#1D9E75',label:'Occupied'},
  VACANT:    {bg:'#F3F4F6',text:'#6B7280',dot:'#9CA3AF',label:'Vacant'},
  MAINTENANCE:{bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Maintenance'},
  NEW_REQ:   {bg:'#EFF6FF',text:'#2563EB',dot:'#2563EB',label:'New'},
  DONE:      {bg:'#F3F4F6',text:'#6B7280',dot:'#9CA3AF',label:'Done'},
  CONFIRMED: {bg:'#E1F5EE',text:'#0F6E56',dot:'#1D9E75',label:'Confirmed'},
  UP:        {bg:'#E1F5EE',text:'#0F6E56',dot:'#1D9E75',label:'Up'},
  DOWN:      {bg:'#FEE2E2',text:'#DC2626',dot:'#DC2626',label:'Down'},
};
export function StatusBadge({ status }) {
  const c=MAP[status]||{bg:'#F3F4F6',text:'#6B7280',dot:'#9CA3AF',label:status};
  return (
    <View style={[ss.b,{backgroundColor:c.bg}]}>
      <View style={[ss.dot,{backgroundColor:c.dot}]}/>
      <Text style={[ss.t,{color:c.text}]}>{c.label}</Text>
    </View>
  );
}
const ss=StyleSheet.create({
  b:{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:3,paddingHorizontal:8,borderRadius:Radius.full,alignSelf:'flex-start'},
  dot:{width:6,height:6,borderRadius:3},t:{fontSize:11,fontWeight:'700'},
});