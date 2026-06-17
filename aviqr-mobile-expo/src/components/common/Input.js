import { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, FontSize } from '../../theme/index.js';
export function Input({ label, error, secureEntry, style, ...props }) {
  const [sec, setSec] = useState(secureEntry);
  const [focus, setFocus] = useState(false);
  return (
    <View style={[ss.wrap,style]}>
      {label && <Text style={ss.label}>{label}</Text>}
      <View style={[ss.row,focus&&ss.focused,error&&ss.errBorder]}>
        <TextInput style={ss.input} placeholderTextColor={Colors.gray400} secureTextEntry={sec}
          onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} {...props}/>
        {secureEntry&&<TouchableOpacity onPress={()=>setSec(s=>!s)} style={ss.eye}>
          <Text style={{color:Colors.gray400}}>{sec?'👁️‍🗨️':'👁️'}</Text>
        </TouchableOpacity>}
      </View>
      {error&&<Text style={ss.err}>{error}</Text>}
    </View>
  );
}
const ss = StyleSheet.create({
  wrap:{marginBottom:12}, label:{fontSize:FontSize.sm,fontWeight:'600',color:Colors.gray700,marginBottom:6},
  row:{flexDirection:'row',alignItems:'center',borderWidth:1.5,borderColor:Colors.gray200,borderRadius:Radius.md,backgroundColor:Colors.white},
  focused:{borderColor:Colors.primary}, errBorder:{borderColor:Colors.error},
  input:{flex:1,height:48,paddingHorizontal:14,fontSize:FontSize.base,color:Colors.gray900},
  eye:{paddingHorizontal:12}, err:{fontSize:FontSize.xs,color:Colors.error,marginTop:4},
});