import { Text as NativeText,TextInput as NativeTextInput,StyleSheet,type TextProps,type TextInputProps } from 'react-native';

function fontStyle(weight:string|number|undefined){
  const value=weight==='bold'?700:Number(weight??400);
  return {fontFamily:value>=800?'Manrope-ExtraBold':value>=700?'Manrope-Bold':value>=600?'Manrope-SemiBold':'Manrope-Regular',fontWeight:'normal' as const};
}

export function Text({style,...props}:TextProps){
  return <NativeText {...props} style={[style,fontStyle(StyleSheet.flatten(style)?.fontWeight)]}/>;
}

export function TextInput({style,ref,...props}:TextInputProps & {ref?:React.Ref<NativeTextInput>}){
  return <NativeTextInput {...props} ref={ref} style={[style,fontStyle(StyleSheet.flatten(style)?.fontWeight)]}/>;
}
