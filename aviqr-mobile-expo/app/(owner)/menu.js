import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useAuth } from '../../src/context/AuthContext.js';
import { menuApi } from '../../src/api/index.js';
import { MOCK_CATEGORIES, MOCK_ITEMS } from '../../src/api/mockData.js';
import { Button } from '../../src/components/common/Button.js';
import { Input } from '../../src/components/common/Input.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

export default function MenuScreen() {
  const { user } = useAuth();
  const shopId = user?.shopId || '00000000-0000-0000-0000-000000000101';
  const [cats, setCats]     = useState(MOCK_CATEGORIES);
  const [items, setItems]   = useState(MOCK_ITEMS);
  const [selCat, setSelCat] = useState(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEdit] = useState(null);
  const [form, setForm]     = useState({ name:'', price:'', description:'', veg:true, spicy:false, popular:false });
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => { loadMenu(); }, []);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const loadMenu = async () => {
    try {
      const [c, i] = await Promise.all([menuApi.getCategories(shopId), menuApi.getAllItems(shopId)]);
      const cd = c.data.data || []; const id = i.data.data || [];
      if(cd.length) { setCats(cd); setOffline(false); }
      if(id.length) setItems(id);
      if(cd.length && !selCat) setSelCat(cd[0]);
    } catch { setOffline(true); if(!selCat&&cats.length) setSelCat(cats[0]); }
  };

  const toggleAvail = async (item) => {
    setItems(prev => prev.map(i => i.id===item.id ? {...i,available:!i.available} : i));
    try { await menuApi.toggleAvail(item.id, !item.available); } catch {}
  };

  const saveItem = async () => {
    if(!form.name || !form.price) return Alert.alert('Required','Name and price are required');
    setSaving(true);
    const data = { ...form, price: parseFloat(form.price), shopId, categoryId: selCat?.id };
    try {
      if(editItem) {
        await menuApi.updateItem(editItem.id, data);
        setItems(prev => prev.map(i => i.id===editItem.id ? {...i,...data} : i));
      } else {
        const res = await menuApi.createItem(data);
        setItems(prev => [...prev, res.data.data||{...data,id:Date.now().toString()}]);
      }
    } catch {
      setItems(prev => editItem ? prev.map(i=>i.id===editItem.id?{...i,...data}:i) : [...prev,{...data,id:Date.now().toString()}]);
    } finally { setSaving(false); setShowAdd(false); setEdit(null); setForm({name:'',price:'',description:'',veg:true,spicy:false,popular:false}); }
  };

  const deleteItem = (item) => Alert.alert('Delete','Remove "'+item.name+'"?',[
    {text:'Cancel',style:'cancel'},
    {text:'Delete',style:'destructive',onPress:async()=>{
      setItems(prev=>prev.filter(i=>i.id!==item.id));
      try{await menuApi.deleteItem(item.id);}catch{}
    }}
  ]);

  const filtered = items.filter(i => {
    if(selCat && i.categoryId!==selCat.id) return false;
    if(search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={ss.screen}>
      <View style={ss.header}>
        <Text style={ss.title}>Menu</Text>
        <TouchableOpacity style={ss.addBtn} onPress={() => { setEdit(null); setForm({name:'',price:'',description:'',veg:true,spicy:false,popular:false}); setShowAdd(true); }}>
          <Text style={ss.addBtnTxt}>+ Add Item</Text>
        </TouchableOpacity>
      </View>
      {offline && <OfflineBadge onRetry={loadMenu}/>}
      <TextInput style={ss.search} placeholder="Search items…" value={search} onChangeText={setSearch} placeholderTextColor={Colors.gray400}/>
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={cats} keyExtractor={c=>c.id}
        style={ss.catList}
        renderItem={({item:cat})=>(
          <TouchableOpacity style={[ss.catChip,selCat?.id===cat.id&&ss.catActive]} onPress={()=>setSelCat(cat)}>
            <Text>{cat.emoji} </Text>
            <Text style={[ss.catTxt,selCat?.id===cat.id&&ss.catActiveTxt]}>{cat.name}</Text>
          </TouchableOpacity>
        )}
      />
      <FlatList data={filtered} keyExtractor={i=>i.id}
        contentContainerStyle={{paddingBottom:32}}
        ListEmptyComponent={<EmptyState icon="🍽️" title="No items" subtitle="Add your first menu item"/>}
        renderItem={({item})=>(
          <View style={ss.item}>
            <View style={[ss.vegDot,{backgroundColor:item.veg?'#1D9E75':'#DC2626'}]}/>
            <View style={ss.itemInfo}>
              <View style={ss.itemRow}>
                <Text style={ss.itemName}>{item.name}</Text>
                {item.popular&&<Text style={ss.tag}>⭐</Text>}
                {item.spicy&&<Text style={ss.tag}>🌶️</Text>}
              </View>
              {item.description&&<Text style={ss.itemDesc} numberOfLines={1}>{item.description}</Text>}
              {item.ratingCount>0&&<Text style={ss.itemRating}>⭐ {Number(item.rating).toFixed(1)} ({item.ratingCount})</Text>}
              <Text style={ss.itemPrice}>₹{item.price}</Text>
            </View>
            <View style={ss.itemActions}>
              <Switch value={!!item.available} onValueChange={()=>toggleAvail(item)} trackColor={{true:Colors.primary}} thumbColor={Colors.white}/>
              <TouchableOpacity onPress={()=>{setEdit(item);setForm({name:item.name,price:String(item.price),description:item.description||'',veg:item.veg,spicy:item.spicy,popular:item.popular});setShowAdd(true);}}>
                <Text style={{color:Colors.gray400,fontSize:16}}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>deleteItem(item)}>
                <Text style={{color:Colors.error,fontSize:16}}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setShowAdd(false)}>
        <ScrollView style={ss.modal} contentContainerStyle={{padding:24}} keyboardShouldPersistTaps="handled">
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>{editItem?'Edit Item':'Add New Item'}</Text>
            <TouchableOpacity onPress={()=>setShowAdd(false)}><Text style={{fontSize:20,color:Colors.gray500}}>✕</Text></TouchableOpacity>
          </View>
          <Input label="Item Name *" placeholder="Paneer Tikka" value={form.name} onChangeText={v=>set('name',v)}/>
          <Input label="Price (₹) *" placeholder="280" value={form.price} onChangeText={v=>set('price',v)} keyboardType="decimal-pad"/>
          <Input label="Description" placeholder="Brief description" value={form.description} onChangeText={v=>set('description',v)} multiline/>
          <View style={ss.switches}>
            {[['Vegetarian','veg'],['Spicy','spicy'],['Popular','popular']].map(([l,k])=>(
              <View key={k} style={ss.switchRow}>
                <Text style={ss.switchLabel}>{l}</Text>
                <Switch value={!!form[k]} onValueChange={v=>set(k,v)} trackColor={{true:Colors.primary}}/>
              </View>
            ))}
          </View>
          <Button title={saving?'Saving…':editItem?'Update Item':'Add Item'} onPress={saveItem} loading={saving} style={{marginTop:16}}/>
          <Button title="Cancel" onPress={()=>setShowAdd(false)} variant="ghost" style={{marginTop:8}}/>
        </ScrollView>
      </Modal>
    </View>
  );
}
const ss = StyleSheet.create({
  screen:{flex:1,backgroundColor:Colors.background},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:52,paddingBottom:12,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  title:{fontSize:FontSize['2xl'],fontWeight:'800',color:Colors.gray900},
  addBtn:{backgroundColor:Colors.primary,paddingHorizontal:14,paddingVertical:7,borderRadius:Radius.md},
  addBtnTxt:{color:Colors.white,fontWeight:'700',fontSize:FontSize.sm},
  search:{height:40,backgroundColor:Colors.gray100,borderRadius:Radius.full,paddingHorizontal:14,margin:12,fontSize:FontSize.base,color:Colors.gray900},
  catList:{paddingHorizontal:12,paddingBottom:8},
  catChip:{flexDirection:'row',alignItems:'center',height:34,paddingHorizontal:14,borderRadius:Radius.full,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,marginRight:8},
  catActive:{backgroundColor:Colors.gray900,borderColor:Colors.gray900},
  catTxt:{fontSize:FontSize.xs,fontWeight:'600',color:Colors.gray600},
  catActiveTxt:{color:Colors.white},
  item:{flexDirection:'row',alignItems:'center',backgroundColor:Colors.white,padding:14,borderBottomWidth:1,borderBottomColor:Colors.gray100,gap:10},
  vegDot:{width:10,height:10,borderRadius:2,borderWidth:1.5,borderColor:Colors.white,flexShrink:0},
  itemInfo:{flex:1,gap:2},
  itemRow:{flexDirection:'row',alignItems:'center',gap:6},
  itemName:{fontSize:FontSize.base,fontWeight:'700',color:Colors.gray900},
  itemDesc:{fontSize:FontSize.xs,color:Colors.gray400},
  itemRating:{fontSize:FontSize.xs,color:Colors.gray500,marginTop:2},
  itemPrice:{fontSize:FontSize.md,fontWeight:'800',color:Colors.primary},
  tag:{fontSize:12},
  itemActions:{flexDirection:'row',alignItems:'center',gap:12},
  modal:{flex:1,backgroundColor:Colors.background},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  modalTitle:{fontSize:FontSize.xl,fontWeight:'800',color:Colors.gray900},
  switches:{flexDirection:'row',gap:10,marginTop:4},
  switchRow:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:Colors.gray50,borderRadius:Radius.md,padding:10},
  switchLabel:{fontSize:FontSize.sm,fontWeight:'600',color:Colors.gray700},
});