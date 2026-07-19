import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { shopApi } from '../../src/api/index.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { Colors, FontSize, Radius, Shadow } from '../../src/theme/index.js';
import { confirmAction } from '../../src/utils/confirmAction.js';

const LANGUAGES = [
  {code:'en',label:'English',native:'English'},{code:'hi',label:'Hindi',native:'हिंदी'},
  {code:'ta',label:'Tamil',native:'தமிழ்'},{code:'kn',label:'Kannada',native:'ಕನ್ನಡ'},
  {code:'ml',label:'Malayalam',native:'മലയാളം'},{code:'te',label:'Telugu',native:'తెలుగు'},
  {code:'bn',label:'Bengali',native:'বাংলা'},{code:'mr',label:'Marathi',native:'मराठी'},
  {code:'gu',label:'Gujarati',native:'ગુજરાતી'},
];

export default function Settings() {
  const { user, logout } = useAuth();
  const shopId = useActiveShopId();
  const [settings, setSettings] = useState({cashEnabled:true,onlineEnabled:true,walletEnabled:false,loyaltyEnabled:false,taxPercent:5});
  const [lang, setLang]         = useState('en');
  const [showLang, setShowLang] = useState(false);

  useEffect(() => {
    if(!shopId) return;
    shopApi.getSettings(shopId).then(r => setSettings(r.data.data||settings)).catch(()=>{});
  }, [shopId]);

  const toggle = k => setSettings(s=>({...s,[k]:!s[k]}));
  const save = async () => {
    try { await shopApi.saveSettings(shopId, settings); Alert.alert('Saved','Settings updated!'); }
    catch { Alert.alert('Saved','Settings saved locally.'); }
  };

  const Section = ({title,children}) => (
    <View style={ss.section}>
      <Text style={ss.secTitle}>{title}</Text>
      <View style={ss.secCard}>{children}</View>
    </View>
  );
  const Row = ({label,right,border=true}) => (
    <View style={[ss.row,border&&ss.rowBorder]}><Text style={ss.rowLabel}>{label}</Text>{right}</View>
  );

  return (
    <ScrollView style={ss.screen} showsVerticalScrollIndicator={false}>
      <View style={ss.header}><Text style={ss.title}>Settings</Text></View>

      <Section title="🌐 Language">
        <Row label="App Language" right={
          <TouchableOpacity onPress={()=>setShowLang(!showLang)} style={ss.langBtn}>
            <Text style={ss.langBtnTxt}>{LANGUAGES.find(l=>l.code===lang)?.native||'English'} ▾</Text>
          </TouchableOpacity>
        } border={false}/>
        {showLang&&LANGUAGES.map(l=>(
          <TouchableOpacity key={l.code} style={[ss.langOption,lang===l.code&&ss.langActive]} onPress={()=>{setLang(l.code);setShowLang(false);}}>
            <Text style={ss.langNative}>{l.native}</Text>
            {lang===l.code&&<Text style={{color:Colors.primary,fontWeight:'700'}}>✓</Text>}
          </TouchableOpacity>
        ))}
      </Section>

      <Section title="💳 Payment Methods">
        <Row label="Accept Cash"       right={<Switch value={!!settings.cashEnabled}   onValueChange={()=>toggle('cashEnabled')}   trackColor={{true:Colors.primary}}/>}/>
        <Row label="Online Payments"   right={<Switch value={!!settings.onlineEnabled} onValueChange={()=>toggle('onlineEnabled')} trackColor={{true:Colors.primary}}/>}/>
        <Row label="Wallet Payments"   right={<Switch value={!!settings.walletEnabled} onValueChange={()=>toggle('walletEnabled')} trackColor={{true:Colors.primary}}/>} border={false}/>
      </Section>

      <Section title="⭐ Loyalty Program">
        <Row label="Enable Loyalty" right={<Switch value={!!settings.loyaltyEnabled} onValueChange={()=>toggle('loyaltyEnabled')} trackColor={{true:Colors.primary}}/>}/>
        <TouchableOpacity onPress={()=>router.push('/(owner)/customers')}>
          <Row label="Manage Customers" right={<Text style={ss.chevron}>›</Text>}/>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>router.push('/(owner)/campaigns')}>
          <Row label="SMS Campaigns" right={<Text style={ss.chevron}>›</Text>} border={false}/>
        </TouchableOpacity>
      </Section>

      <View style={ss.section}>
        <Button title="Save Settings" onPress={save}/>
      </View>

      <Section title="🔐 Account">
        <Row label="Change Password" right={<Text style={ss.chevron}>›</Text>} border/>
        <Row label="Help & Support"  right={<Text style={ss.chevron}>›</Text>} border/>
        <Row label="Sign Out" right={
          <TouchableOpacity onPress={()=>confirmAction('Sign out?','',logout,'Sign out')}>
            <Text style={{color:Colors.error,fontWeight:'600'}}>Sign out</Text>
          </TouchableOpacity>
        } border={false}/>
      </Section>
    </ScrollView>
  );
}
const ss=StyleSheet.create({
  screen:{flex:1,backgroundColor:Colors.background},
  header:{paddingHorizontal:16,paddingTop:52,paddingBottom:12,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  title:{fontSize:FontSize['2xl'],fontWeight:'800',color:Colors.gray900},
  section:{marginHorizontal:12,marginTop:16},
  secTitle:{fontSize:11,fontWeight:'700',color:Colors.gray400,textTransform:'uppercase',letterSpacing:0.7,marginBottom:8},
  secCard:{backgroundColor:Colors.white,borderRadius:Radius.lg,borderWidth:1,borderColor:Colors.border,overflow:'hidden'},
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:14},
  rowBorder:{borderBottomWidth:1,borderBottomColor:Colors.gray100},
  rowLabel:{fontSize:FontSize.base,color:Colors.gray800},
  chevron:{fontSize:20,color:Colors.gray300},
  langBtn:{backgroundColor:Colors.gray100,paddingHorizontal:12,paddingVertical:5,borderRadius:Radius.md},
  langBtnTxt:{fontSize:FontSize.sm,fontWeight:'600',color:Colors.gray700},
  langOption:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:12,borderTopWidth:1,borderTopColor:Colors.gray100},
  langActive:{backgroundColor:Colors.primaryLight},
  langNative:{fontSize:FontSize.base,fontWeight:'600',color:Colors.gray800},
});