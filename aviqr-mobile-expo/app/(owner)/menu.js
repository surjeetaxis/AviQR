import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext.js';
import { useActiveShopId } from '../../src/hooks/useActiveShopId.js';
import { menuApi } from '../../src/api/index.js';
import { Button } from '../../src/components/common/Button.js';
import { Input } from '../../src/components/common/Input.js';
import { MenuItemModal, EMPTY_MENU_ITEM } from '../../src/components/common/MenuItemModal.js';
import { EmptyState } from '../../src/components/common/EmptyState.js';
import { OfflineBadge } from '../../src/components/common/OfflineBadge.js';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../../src/theme/index.js';

function itemToForm(item) {
  return item ? {
    name: item.name, price: String(item.price), description: item.description || '',
    veg: item.veg, spicy: item.spicy, popular: item.popular,
    imageUrl: item.imageUrl || '', videoUrl: item.videoUrl || '', modelUrl: item.modelUrl || '',
    mediaType: item.mediaType || 'NONE',
    nameHi: item.nameHi || '', nameTa: item.nameTa || '', nameTe: item.nameTe || '',
  } : EMPTY_MENU_ITEM;
}

export default function MenuScreen() {
  const { user } = useAuth();
  const shopId = useActiveShopId();
  const [cats, setCats]     = useState([]);
  const [items, setItems]   = useState([]);
  const [selCat, setSelCat] = useState(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEdit] = useState(null);
  const [offline, setOffline] = useState(false);
  const [catSheet, setCatSheet] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', emoji: '' });
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => { if(shopId) loadMenu(); }, [shopId]);

  const loadMenu = async () => {
    try {
      const [c, i] = await Promise.all([menuApi.getCategories(shopId), menuApi.getItems(shopId)]);
      const cd = c.data.data || []; const id = i.data.data || [];
      setCats(cd); setItems(id); setOffline(false);
      if(cd.length && !selCat) setSelCat(cd[0]);
    } catch { setOffline(true); }
  };

  const toggleAvail = async (item) => {
    setItems(prev => prev.map(i => i.id===item.id ? {...i,available:!i.available} : i));
    try { await menuApi.toggleAvail(item.id, !item.available); } catch {}
  };

  const saveItem = async (form) => {
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
    } finally { setShowAdd(false); setEdit(null); }
  };

  const deleteItem = (item) => Alert.alert('Delete','Remove "'+item.name+'"?',[
    {text:'Cancel',style:'cancel'},
    {text:'Delete',style:'destructive',onPress:async()=>{
      setItems(prev=>prev.filter(i=>i.id!==item.id));
      try{await menuApi.deleteItem(item.id);}catch{}
    }}
  ]);

  const openNewCat = () => { setEditCat(null); setCatForm({ name: '', emoji: '' }); setCatSheet(true); };
  const openEditCat = (cat) => { setEditCat(cat); setCatForm({ name: cat.name, emoji: cat.emoji || '' }); setCatSheet(true); };
  const saveCat = async () => {
    if (!catForm.name.trim()) return Alert.alert('Category name is required');
    setSavingCat(true);
    try {
      if (editCat) {
        await menuApi.updateCategory(editCat.id, { ...editCat, ...catForm });
        setCats(prev => prev.map(c => c.id === editCat.id ? { ...c, ...catForm } : c));
      } else {
        const res = await menuApi.createCategory({ shopId, ...catForm });
        setCats(prev => [...prev, res.data.data]);
      }
      setCatSheet(false);
    } catch { Alert.alert('Could not save category'); }
    finally { setSavingCat(false); }
  };
  const deleteCat = (cat) => Alert.alert('Delete category', `Remove "${cat.name}"? Items stay but lose this category.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try {
        await menuApi.deleteCategory(cat.id);
        setCats(prev => prev.filter(c => c.id !== cat.id));
        if (selCat?.id === cat.id) setSelCat(null);
        setCatSheet(false);
      } catch { Alert.alert('Could not delete category'); }
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
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={ss.scanBtn} onPress={() => router.push('/(owner)/scan-menu')}>
            <Text style={ss.scanBtnTxt}>📷 Scan Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ss.addBtn} onPress={() => { setEdit(null); setShowAdd(true); }}>
            <Text style={ss.addBtnTxt}>+ Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>
      {offline && <OfflineBadge onRetry={loadMenu}/>}
      <TextInput style={ss.search} placeholder="Search items…" value={search} onChangeText={setSearch} placeholderTextColor={Colors.gray400}/>
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={[...cats, { id: '__add__' }]} keyExtractor={c=>c.id}
        style={ss.catList}
        renderItem={({item:cat})=> cat.id === '__add__' ? (
          <TouchableOpacity style={[ss.catChip, ss.catAddChip]} onPress={openNewCat}>
            <Text style={ss.catAddTxt}>+ Category</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[ss.catChip,selCat?.id===cat.id&&ss.catActive]} onPress={()=>setSelCat(cat)} onLongPress={()=>openEditCat(cat)}>
            <Text>{cat.emoji} </Text>
            <Text style={[ss.catTxt,selCat?.id===cat.id&&ss.catActiveTxt]}>{cat.name}</Text>
          </TouchableOpacity>
        )}
      />
      <Text style={ss.catHint}>Long-press a category to edit or delete it</Text>
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
              <Text style={ss.itemPrice}>₹{item.price}</Text>
            </View>
            <View style={ss.itemActions}>
              <Switch value={!!item.available} onValueChange={()=>toggleAvail(item)} trackColor={{true:Colors.primary}} thumbColor={Colors.white}/>
              <TouchableOpacity onPress={()=>{setEdit(item);setShowAdd(true);}}>
                <Text style={{color:Colors.gray400,fontSize:16}}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>deleteItem(item)}>
                <Text style={{color:Colors.error,fontSize:16}}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <MenuItemModal
        visible={showAdd}
        title={editItem ? 'Edit Item' : 'Add New Item'}
        submitLabel={editItem ? 'Update Item' : 'Add Item'}
        initialForm={itemToForm(editItem)}
        onSave={saveItem}
        onClose={() => { setShowAdd(false); setEdit(null); }}
      />

      <Modal visible={catSheet} transparent animationType="slide" onRequestClose={()=>setCatSheet(false)}>
        <View style={ss.catModalOverlay}>
          <View style={ss.catModalCard}>
            <Text style={ss.modalTitle}>{editCat ? 'Edit category' : 'New category'}</Text>
            <Input label="Name" placeholder="Starters" value={catForm.name} onChangeText={v=>setCatForm(f=>({...f,name:v}))}/>
            <Input label="Emoji (optional)" placeholder="🍢" value={catForm.emoji} onChangeText={v=>setCatForm(f=>({...f,emoji:v}))}/>
            <Button title={savingCat?'Saving…':'Save'} onPress={saveCat} loading={savingCat} style={{marginTop:12}}/>
            {editCat && <Button title="Delete category" onPress={()=>deleteCat(editCat)} variant="danger" style={{marginTop:8}}/>}
            <Button title="Cancel" onPress={()=>setCatSheet(false)} variant="ghost" style={{marginTop:8}}/>
          </View>
        </View>
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
  scanBtn:{backgroundColor:Colors.gray100,paddingHorizontal:14,paddingVertical:7,borderRadius:Radius.md,borderWidth:1,borderColor:Colors.border},
  scanBtnTxt:{color:Colors.gray700,fontWeight:'700',fontSize:FontSize.sm},
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
  itemPrice:{fontSize:FontSize.md,fontWeight:'800',color:Colors.primary},
  tag:{fontSize:12},
  itemActions:{flexDirection:'row',alignItems:'center',gap:12},
  modalTitle:{fontSize:FontSize.xl,fontWeight:'800',color:Colors.gray900},
  catAddChip:{borderStyle:'dashed',borderColor:Colors.primary},
  catAddTxt:{fontSize:FontSize.xs,fontWeight:'700',color:Colors.primary},
  catHint:{fontSize:10,color:Colors.gray400,paddingHorizontal:12,marginBottom:6},
  catModalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.45)',justifyContent:'flex-end'},
  catModalCard:{backgroundColor:Colors.white,borderTopLeftRadius:Radius.xl,borderTopRightRadius:Radius.xl,padding:20},
});