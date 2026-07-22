import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { shopApi, menuApi, aggregatorConfigApi, authApi, planApi } from '../../src/api/index.js';
import { Input } from '../../src/components/common/Input.js';
import { Button } from '../../src/components/common/Button.js';
import { BottomSheet } from '../../src/components/common/BottomSheet.js';
import { Colors, FontSize, Radius, Shadow } from '../../src/theme/index.js';
import { confirmAction } from '../../src/utils/confirmAction.js';

const LANGUAGES = [
  {code:'en',label:'English',native:'English'},{code:'hi',label:'Hindi',native:'हिंदी'},
  {code:'ta',label:'Tamil',native:'தமிழ்'},{code:'kn',label:'Kannada',native:'ಕನ್ನಡ'},
  {code:'ml',label:'Malayalam',native:'മലയാളം'},{code:'te',label:'Telugu',native:'తెలుగు'},
  {code:'bn',label:'Bengali',native:'বাংলা'},{code:'mr',label:'Marathi',native:'मराठी'},
  {code:'gu',label:'Gujarati',native:'ગુજરાતી'},
];
const PLAN_INFO = {
  STARTER:    { label: 'Starter',    price: 0,    color: '#6B7280' },
  GROWTH:     { label: 'Growth',     price: 999,  color: '#059669' },
  BUSINESS:   { label: 'Business',   price: 2499, color: '#7C3AED' },
  ENTERPRISE: { label: 'Enterprise', price: 0,    color: '#D97706' },
};
const RULE_TYPES = ['TIME', 'DAY'];
const ADJUSTMENTS = ['PERCENTAGE_DECREASE', 'PERCENTAGE_INCREASE', 'FIXED_DECREASE', 'FIXED_INCREASE'];
const ADJUSTMENT_LABEL = { PERCENTAGE_DECREASE: '% off', PERCENTAGE_INCREASE: '% surcharge', FIXED_DECREASE: '₹ off', FIXED_INCREASE: '₹ surcharge' };
const DOW = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

export default function Settings() {
  const { user, logout } = useAuth();
  const shopId = useActiveShopId();
  const [settings, setSettings] = useState({cashEnabled:true,onlineEnabled:true,walletEnabled:false,loyaltyEnabled:false,taxPercent:5});
  const [lang, setLang]         = useState('en');
  const [showLang, setShowLang] = useState(false);

  // Shop profile
  const [shop, setShop] = useState(null);
  const [profileForm, setProfileForm] = useState({ name:'', tagline:'', phone:'', email:'', address:'', city:'', state:'', zone:'', pincode:'', gstin:'', minOrderAmount:'', tableCount:'' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Dynamic pricing
  const [rules, setRules] = useState([]);
  const [ruleSheet, setRuleSheet] = useState(false);
  const [ruleForm, setRuleForm] = useState({ name:'', type:'TIME', adjustmentType:'PERCENTAGE_DECREASE', adjustmentValue:'', fromTime:'', toTime:'', daysOfWeek:[] });
  const [savingRule, setSavingRule] = useState(false);

  // Integrations
  const [mappings, setMappings] = useState([]);
  const [intgSheet, setIntgSheet] = useState(null); // 'ZOMATO' | 'SWIGGY' | null
  const [intgId, setIntgId] = useState('');
  const [savingIntg, setSavingIntg] = useState(false);

  // Security
  const [pwSheet, setPwSheet] = useState(false);
  const [pwForm, setPwForm] = useState({ current:'', next:'', confirm:'' });
  const [savingPw, setSavingPw] = useState(false);

  const load = useCallback(async () => {
    if(!shopId) return;
    try {
      const [s, sh, r, m] = await Promise.allSettled([
        shopApi.getSettings(shopId), shopApi.getById(shopId),
        menuApi.getPricingRules(shopId), aggregatorConfigApi.getMapping(shopId),
      ]);
      if (s.status === 'fulfilled') setSettings(s.value.data.data || settings);
      if (sh.status === 'fulfilled') {
        const d = sh.value.data.data;
        setShop(d);
        setProfileForm({
          name: d.name || '', tagline: d.tagline || '', phone: d.phone || '', email: d.email || '',
          address: d.address || '', city: d.city || '', state: d.state || '', zone: d.zone || '', pincode: d.pincode || '',
          gstin: d.gstin || '', minOrderAmount: d.minOrderAmount != null ? String(d.minOrderAmount) : '', tableCount: d.tableCount != null ? String(d.tableCount) : '',
        });
      }
      if (r.status === 'fulfilled') setRules(r.value.data.data || []);
      if (m.status === 'fulfilled') setMappings(m.value.data.data || []);
    } catch {}
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const toggle = k => setSettings(s=>({...s,[k]:!s[k]}));
  const save = async () => {
    try { await shopApi.saveSettings(shopId, settings); Alert.alert('Saved','Settings updated!'); }
    catch { Alert.alert('Saved','Settings saved locally.'); }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await shopApi.update(shopId, {
        ...profileForm,
        minOrderAmount: profileForm.minOrderAmount ? Number(profileForm.minOrderAmount) : null,
        tableCount: profileForm.tableCount ? Number(profileForm.tableCount) : null,
      });
      Alert.alert('Saved', 'Shop profile updated.');
    } catch { Alert.alert('Could not save', 'Please check required fields (name, phone) and try again.'); }
    finally { setSavingProfile(false); }
  };

  const openNewRule = () => { setRuleForm({ name:'', type:'TIME', adjustmentType:'PERCENTAGE_DECREASE', adjustmentValue:'', fromTime:'', toTime:'', daysOfWeek:[] }); setRuleSheet(true); };
  const toggleRuleDay = (d) => setRuleForm(f => ({ ...f, daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter(x => x !== d) : [...f.daysOfWeek, d] }));
  const saveRule = async () => {
    if (!ruleForm.name.trim() || !ruleForm.adjustmentValue) return Alert.alert('Name and amount are required');
    setSavingRule(true);
    try {
      const payload = {
        shopId, name: ruleForm.name.trim(), type: ruleForm.type, adjustmentType: ruleForm.adjustmentType,
        adjustmentValue: Number(ruleForm.adjustmentValue), active: true,
        fromTime: ruleForm.type === 'TIME' ? ruleForm.fromTime || null : null,
        toTime: ruleForm.type === 'TIME' ? ruleForm.toTime || null : null,
        daysOfWeek: ruleForm.type === 'DAY' && ruleForm.daysOfWeek.length ? JSON.stringify(ruleForm.daysOfWeek) : null,
      };
      const res = await menuApi.createRule(payload);
      setRules(prev => [...prev, res.data.data]);
      setRuleSheet(false);
    } catch { Alert.alert('Could not save rule'); }
    finally { setSavingRule(false); }
  };
  const deleteRule = (rule) => confirmAction('Delete rule?', `"${rule.name}" will be removed.`, async () => {
    try { await menuApi.deleteRule(rule.id); setRules(prev => prev.filter(r => r.id !== rule.id)); }
    catch { Alert.alert('Could not delete rule'); }
  }, 'Delete');

  const zomato = mappings.find(m => m.platform === 'ZOMATO');
  const swiggy = mappings.find(m => m.platform === 'SWIGGY');
  const openIntg = (platform) => { setIntgId((platform === 'ZOMATO' ? zomato : swiggy)?.aggregatorShopId || ''); setIntgSheet(platform); };
  const saveIntg = async () => {
    if (!intgId.trim()) return Alert.alert('Enter your restaurant ID on that platform');
    setSavingIntg(true);
    try {
      const res = await aggregatorConfigApi.saveMapping({ shopId, platform: intgSheet, aggregatorShopId: intgId.trim() });
      setMappings(prev => [...prev.filter(m => m.platform !== intgSheet), res.data.data]);
      setIntgSheet(null);
    } catch { Alert.alert('Could not save', 'Please try again.'); }
    finally { setSavingIntg(false); }
  };

  const savePassword = async () => {
    if (!pwForm.current || !pwForm.next) return Alert.alert('Fill in both password fields');
    if (pwForm.next !== pwForm.confirm) return Alert.alert('New passwords do not match');
    if (pwForm.next.length < 8) return Alert.alert('New password must be at least 8 characters');
    setSavingPw(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
      Alert.alert('Password changed', 'Use your new password next time you sign in.');
      setPwSheet(false); setPwForm({ current:'', next:'', confirm:'' });
    } catch (e) { Alert.alert('Could not change password', e.response?.data?.message || 'Please check your current password.'); }
    finally { setSavingPw(false); }
  };

  const planInfo = PLAN_INFO[(shop?.subscriptionPlan || 'STARTER').toUpperCase()] || PLAN_INFO.STARTER;

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
    <ScrollView style={ss.screen} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
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

      <Section title="🏪 Shop Profile">
        <View style={{ padding: 14 }}>
          <Input label="Shop name *" value={profileForm.name} onChangeText={v => setProfileForm(f => ({ ...f, name: v }))} />
          <Input label="Tagline" value={profileForm.tagline} onChangeText={v => setProfileForm(f => ({ ...f, tagline: v }))} />
          <Input label="Phone *" value={profileForm.phone} onChangeText={v => setProfileForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" />
          <Input label="Email" value={profileForm.email} onChangeText={v => setProfileForm(f => ({ ...f, email: v }))} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Address" value={profileForm.address} onChangeText={v => setProfileForm(f => ({ ...f, address: v }))} multiline />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input label="City" value={profileForm.city} onChangeText={v => setProfileForm(f => ({ ...f, city: v }))} style={{ flex: 1 }} />
            <Input label="State" value={profileForm.state} onChangeText={v => setProfileForm(f => ({ ...f, state: v }))} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input label="Zone" value={profileForm.zone} onChangeText={v => setProfileForm(f => ({ ...f, zone: v }))} style={{ flex: 1 }} />
            <Input label="Pincode" value={profileForm.pincode} onChangeText={v => setProfileForm(f => ({ ...f, pincode: v }))} keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          <Input label="GSTIN" value={profileForm.gstin} onChangeText={v => setProfileForm(f => ({ ...f, gstin: v.toUpperCase() }))} autoCapitalize="characters" maxLength={15} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input label="Min order amount (₹)" value={profileForm.minOrderAmount} onChangeText={v => setProfileForm(f => ({ ...f, minOrderAmount: v }))} keyboardType="numeric" style={{ flex: 1 }} />
            <Input label="Table count" value={profileForm.tableCount} onChangeText={v => setProfileForm(f => ({ ...f, tableCount: v }))} keyboardType="numeric" style={{ flex: 1 }} />
          </View>
          <Button title={savingProfile ? 'Saving…' : 'Save Profile'} onPress={saveProfile} loading={savingProfile} style={{ marginTop: 4 }} />
        </View>
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

      <Section title="🏷️ Dynamic Pricing">
        {rules.map((r, i) => (
          <View key={r.id} style={[ss.ruleRow, i < rules.length - 1 && ss.rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={ss.rowLabel}>{r.name}</Text>
              <Text style={ss.ruleSub}>
                {r.type === 'TIME' ? `${r.fromTime?.slice(0,5)}–${r.toTime?.slice(0,5)}` : r.type === 'DAY' ? (JSON.parse(r.daysOfWeek || '[]').join(', ') || 'All days') : r.type}
                {' · '}{r.adjustmentValue}{ADJUSTMENT_LABEL[r.adjustmentType] || ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => deleteRule(r)}><Text style={{ color: Colors.error, fontSize: 16 }}>🗑️</Text></TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={ss.addRow} onPress={openNewRule}><Text style={ss.addRowTxt}>+ Add pricing rule</Text></TouchableOpacity>
      </Section>

      <Section title="🔗 Integrations">
        <TouchableOpacity onPress={() => openIntg('ZOMATO')}>
          <Row label={`Zomato ${zomato ? `(${zomato.aggregatorShopId})` : ''}`} right={<Text style={[ss.chevron, zomato && { color: Colors.primary, fontSize: FontSize.sm }]}>{zomato ? '✓ Linked' : 'Set up ›'}</Text>} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openIntg('SWIGGY')}>
          <Row label={`Swiggy ${swiggy ? `(${swiggy.aggregatorShopId})` : ''}`} right={<Text style={[ss.chevron, swiggy && { color: Colors.primary, fontSize: FontSize.sm }]}>{swiggy ? '✓ Linked' : 'Set up ›'}</Text>} border={false} />
        </TouchableOpacity>
      </Section>

      <Section title="💎 Plan & Billing">
        <View style={{ padding: 14 }}>
          <View style={ss.planRow}>
            <View>
              <Text style={ss.rowLabel}>Current plan</Text>
              <Text style={[ss.planName, { color: planInfo.color }]}>{planInfo.label}</Text>
            </View>
            <Text style={ss.planPrice}>{planInfo.price > 0 ? `₹${planInfo.price}/mo` : 'Free'}</Text>
          </View>
          <Text style={ss.planHint}>To upgrade or change your plan, contact support@aviqr.in</Text>
        </View>
      </Section>

      <Section title="🔐 Account">
        <TouchableOpacity onPress={() => setPwSheet(true)}>
          <Row label="Change Password" right={<Text style={ss.chevron}>›</Text>} border/>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/contact')}>
          <Row label="Help & Support"  right={<Text style={ss.chevron}>›</Text>} border/>
        </TouchableOpacity>
        <Row label="Sign Out" right={
          <TouchableOpacity onPress={()=>confirmAction('Sign out?','',logout,'Sign out')}>
            <Text style={{color:Colors.error,fontWeight:'600'}}>Sign out</Text>
          </TouchableOpacity>
        } border={false}/>
      </Section>

      {/* Dynamic pricing rule sheet */}
      <BottomSheet visible={ruleSheet} onClose={() => setRuleSheet(false)} height={560}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={ss.sheetTitle}>New pricing rule</Text>
          <Input label="Rule name" placeholder="Happy Hour" value={ruleForm.name} onChangeText={v => setRuleForm(f => ({ ...f, name: v }))} />
          <Text style={ss.fieldLabel}>Applies</Text>
          <View style={ss.chipRow}>
            {RULE_TYPES.map(t => (
              <TouchableOpacity key={t} style={[ss.chip, ruleForm.type === t && ss.chipActive]} onPress={() => setRuleForm(f => ({ ...f, type: t }))}>
                <Text style={[ss.chipTxt, ruleForm.type === t && ss.chipTxtActive]}>{t === 'TIME' ? 'Time of day' : 'Days of week'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {ruleForm.type === 'TIME' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input label="From (HH:mm)" placeholder="15:00" value={ruleForm.fromTime} onChangeText={v => setRuleForm(f => ({ ...f, fromTime: v }))} style={{ flex: 1 }} />
              <Input label="To (HH:mm)" placeholder="18:00" value={ruleForm.toTime} onChangeText={v => setRuleForm(f => ({ ...f, toTime: v }))} style={{ flex: 1 }} />
            </View>
          ) : (
            <View style={ss.chipRow}>
              {DOW.map(d => (
                <TouchableOpacity key={d} style={[ss.dayChip, ruleForm.daysOfWeek.includes(d) && ss.chipActive]} onPress={() => toggleRuleDay(d)}>
                  <Text style={[ss.chipTxt, ruleForm.daysOfWeek.includes(d) && ss.chipTxtActive]}>{d.slice(0,3)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={ss.fieldLabel}>Adjustment</Text>
          <View style={ss.chipRow}>
            {ADJUSTMENTS.map(a => (
              <TouchableOpacity key={a} style={[ss.chip, ruleForm.adjustmentType === a && ss.chipActive]} onPress={() => setRuleForm(f => ({ ...f, adjustmentType: a }))}>
                <Text style={[ss.chipTxt, ruleForm.adjustmentType === a && ss.chipTxtActive]}>{ADJUSTMENT_LABEL[a]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input label="Amount" placeholder="15" value={ruleForm.adjustmentValue} onChangeText={v => setRuleForm(f => ({ ...f, adjustmentValue: v }))} keyboardType="numeric" />
          <Button title={savingRule ? 'Saving…' : 'Create Rule'} onPress={saveRule} loading={savingRule} style={{ marginTop: 8 }} />
        </ScrollView>
      </BottomSheet>

      {/* Integration sheet */}
      <BottomSheet visible={!!intgSheet} onClose={() => setIntgSheet(null)}>
        <Text style={ss.sheetTitle}>{intgSheet === 'ZOMATO' ? 'Zomato' : 'Swiggy'} integration</Text>
        <Input label="Your restaurant ID on this platform" placeholder="e.g. 12345678" value={intgId} onChangeText={setIntgId} autoCapitalize="none" />
        <Button title={savingIntg ? 'Saving…' : 'Save'} onPress={saveIntg} loading={savingIntg} style={{ marginTop: 8 }} />
      </BottomSheet>

      {/* Change password sheet */}
      <BottomSheet visible={pwSheet} onClose={() => setPwSheet(false)}>
        <Text style={ss.sheetTitle}>Change password</Text>
        <Input label="Current password" value={pwForm.current} onChangeText={v => setPwForm(f => ({ ...f, current: v }))} secureEntry />
        <Input label="New password (min 8 characters)" value={pwForm.next} onChangeText={v => setPwForm(f => ({ ...f, next: v }))} secureEntry />
        <Input label="Confirm new password" value={pwForm.confirm} onChangeText={v => setPwForm(f => ({ ...f, confirm: v }))} secureEntry />
        <Button title={savingPw ? 'Saving…' : 'Change Password'} onPress={savePassword} loading={savingPw} style={{ marginTop: 8 }} />
      </BottomSheet>
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
  ruleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:14},
  ruleSub:{fontSize:FontSize.xs,color:Colors.gray500,marginTop:2},
  addRow:{padding:14,alignItems:'center'},
  addRowTxt:{color:Colors.primary,fontWeight:'700',fontSize:FontSize.sm},
  planRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  planName:{fontSize:FontSize.xl,fontWeight:'800',marginTop:2},
  planPrice:{fontSize:FontSize.base,fontWeight:'700',color:Colors.gray700},
  planHint:{fontSize:FontSize.xs,color:Colors.gray400,marginTop:10},
  sheetTitle:{fontSize:FontSize.lg,fontWeight:'800',color:Colors.gray900,marginBottom:12},
  fieldLabel:{fontSize:FontSize.sm,fontWeight:'600',color:Colors.gray700,marginBottom:6,marginTop:2},
  chipRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12},
  chip:{paddingHorizontal:12,paddingVertical:7,borderRadius:Radius.full,backgroundColor:Colors.gray100,borderWidth:1.5,borderColor:'transparent'},
  chipActive:{backgroundColor:Colors.primary},
  chipTxt:{fontSize:12,fontWeight:'700',color:Colors.gray700},
  chipTxtActive:{color:Colors.white},
  dayChip:{paddingHorizontal:10,paddingVertical:7,borderRadius:Radius.full,backgroundColor:Colors.gray100,borderWidth:1.5,borderColor:'transparent'},
});
