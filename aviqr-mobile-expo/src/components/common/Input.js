import { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, FontSize } from '../../theme/index.js';
import { EyeIcon, EyeOffIcon } from './NavIcons.js';
export function Input({ label, error, secureEntry, style, ...props }) {
  const [sec, setSec] = useState(secureEntry);
  const [focus, setFocus] = useState(false);
  return (
    <View style={[ss.wrap,style]}>
      {label && <Text style={ss.label}>{label}</Text>}
      <View style={[ss.row,focus&&ss.focused,error&&ss.errBorder]}>
        <TextInput style={ss.input} accessibilityLabel={label} placeholderTextColor={Colors.gray400} secureTextEntry={sec}
          onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} {...props}/>
        {secureEntry&&<TouchableOpacity accessibilityRole="button" accessibilityLabel={sec?'Show password':'Hide password'} onPress={()=>setSec(s=>!s)} style={ss.eye}>
          {sec ? <EyeIcon size={18} color={Colors.gray500} /> : <EyeOffIcon size={18} color={Colors.gray500} />}
        </TouchableOpacity>}
      </View>
      {error&&<Text accessibilityLiveRegion="polite" style={ss.err}>{error}</Text>}
    </View>
  );
}
const ss = StyleSheet.create({
  wrap:{marginBottom:12}, label:{fontSize:FontSize.sm,fontWeight:'600',color:Colors.gray700,marginBottom:6},
  row:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,backgroundColor:Colors.white},
  focused:{borderColor:Colors.primary,backgroundColor:Colors.gray50}, errBorder:{borderColor:Colors.error},
  input:{flex:1,minHeight:50,paddingVertical:12,paddingHorizontal:14,fontSize:FontSize.base,color:Colors.gray900},
  eye:{paddingHorizontal:12,minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}, err:{fontSize:FontSize.xs,color:Colors.error,marginTop:4},
});
