import {useEffect,useState} from 'react';
import {Modal,View,Text,TouchableOpacity,Platform} from 'react-native';
import {WebView} from 'react-native-webview';
import {subscribeCaptcha,finishCaptcha} from '../../api/captchaBroker.js';
const WEB_URL=process.env.EXPO_PUBLIC_WEB_URL||'https://aviqr.com';
export default function CaptchaPrompt(){const [request,setRequest]=useState(null);useEffect(()=>subscribeCaptcha(setRequest),[]);if(!request)return null;
 const origin=new URL(WEB_URL).origin,uri=origin+'/captcha?siteKey='+encodeURIComponent(request.siteKey);
 const message=e=>{try{if(new URL(e.nativeEvent.url).origin!==origin)return;const data=JSON.parse(e.nativeEvent.data);if(data.type==='captcha' && typeof data.token==='string' && data.token.length>0 && data.token.length<=2048)finishCaptcha(data.token);}catch{}};
 return <Modal visible transparent onRequestClose={()=>finishCaptcha(null)}><View style={{flex:1,padding:24,justifyContent:'center',backgroundColor:'#0008'}}><View style={{height:440,backgroundColor:'white',borderRadius:16,padding:16}}><Text style={{fontSize:20,fontWeight:'700'}}>Security check</Text>{Platform.OS==='web'?<Text>Open the AviQR website to complete security verification.</Text>:<WebView source={{uri}} originWhitelist={[origin,'https://challenges.cloudflare.com']} onShouldStartLoadWithRequest={req=>{try{return req.url==='about:blank'||[origin,'https://challenges.cloudflare.com'].includes(new URL(req.url).origin);}catch{return false;}}} onMessage={message} javaScriptEnabled allowFileAccess={false} mixedContentMode="never" setSupportMultipleWindows={false}/>}<TouchableOpacity onPress={()=>finishCaptcha(null)}><Text style={{padding:16,textAlign:'center'}}>Cancel</Text></TouchableOpacity></View></View></Modal>;
}
