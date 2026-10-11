import { View, Text, StyleSheet } from 'react-native';
import { Radius, Colors } from '../../theme/index.js';
const MAP = {
  NEW:       {bg:'#EFF6FF',text:'#2563EB',dot:'#2563EB',label:'New'},
  ACCEPTED:  {bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Accepted'},
  PREPARING: {bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Preparing'},
  READY:     {bg:'#ECFDF5',text:'#065F46',dot:'#059669',label:'Ready'},
  COMPLETED: {bg:Colors.gray100,text:Colors.gray500,dot:Colors.gray400,label:'Done'},
  CANCELLED: {bg:'#FEE2E2',text:'#DC2626',dot:'#DC2626',label:'Cancelled'},
  ACTIVE:    {bg:Colors.primaryLight,text:Colors.primaryDark,dot:Colors.primary,label:'Active'},
  INACTIVE:  {bg:Colors.gray100,text:Colors.gray500,dot:Colors.gray400,label:'Inactive'},
  SUSPENDED: {bg:'#FEE2E2',text:'#DC2626',dot:'#DC2626',label:'Suspended'},
  OPEN:      {bg:'#EFF6FF',text:'#2563EB',dot:'#2563EB',label:'Open'},
  PENDING:   {bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Pending'},
  RESOLVED:  {bg:Colors.primaryLight,text:Colors.primaryDark,dot:Colors.primary,label:'Resolved'},
  OCCUPIED:  {bg:Colors.primaryLight,text:Colors.primaryDark,dot:Colors.primary,label:'Occupied'},
  VACANT:    {bg:Colors.gray100,text:Colors.gray500,dot:Colors.gray400,label:'Vacant'},
  MAINTENANCE:{bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Maintenance'},
  NEW_REQ:   {bg:'#EFF6FF',text:'#2563EB',dot:'#2563EB',label:'New'},
  DONE:      {bg:Colors.gray100,text:Colors.gray500,dot:Colors.gray400,label:'Done'},
  CONFIRMED: {bg:Colors.primaryLight,text:Colors.primaryDark,dot:Colors.primary,label:'Confirmed'},
  UP:        {bg:Colors.primaryLight,text:Colors.primaryDark,dot:Colors.primary,label:'Up'},
  DOWN:      {bg:'#FEE2E2',text:'#DC2626',dot:'#DC2626',label:'Down'},
  BOOKED:      {bg:'#EFF6FF',text:'#2563EB',dot:'#2563EB',label:'Booked'},
  CHECKED_IN:  {bg:Colors.primaryLight,text:Colors.primaryDark,dot:Colors.primary,label:'Checked in'},
  CHECKED_OUT: {bg:Colors.gray100,text:Colors.gray500,dot:Colors.gray400,label:'Checked out'},
  NO_SHOW:     {bg:'#FEE2E2',text:'#DC2626',dot:'#DC2626',label:'No-show'},
  AUTHORIZED:  {bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Authorized'},
  CAPTURED:    {bg:Colors.primaryLight,text:Colors.primaryDark,dot:Colors.primary,label:'Captured'},
  WAITING:     {bg:'#FEF3C7',text:'#D97706',dot:'#D97706',label:'Waiting'},
  NOTIFIED:    {bg:Colors.primaryLight,text:Colors.primaryDark,dot:Colors.primary,label:'Notified'},
};
export function StatusBadge({ status }) {
  const c=MAP[status]||{bg:Colors.gray100,text:Colors.gray500,dot:Colors.gray400,label:status};
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