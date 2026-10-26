import { Text } from '@/theme/Typography';
import React from 'react';
import { TouchableOpacity,View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnchoredPopover,PopoverAnchor } from './AnchoredPopover';
import { light } from '@/theme';
import { t } from '@/i18n';

export function SelectionPopover({visible,onClose,title,hint,action,c,children,anchor}:{visible:boolean;onClose:()=>void;title:string;hint?:string;action?:React.ReactNode;c:typeof light;children:React.ReactNode;anchor:PopoverAnchor|null}){
  return <AnchoredPopover visible={visible} onClose={onClose} anchor={anchor} c={c}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
      <View style={{flex:1}}><Text accessibilityRole="header" style={{color:c.text,fontSize:17,fontWeight:'700'}}>{title}</Text>{hint&&<Text style={{color:c.muted,fontSize:13,marginTop:4}}>{hint}</Text>}</View>
      {action}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="close" size={20} color={c.muted}/></TouchableOpacity>
    </View>
    {children}
  </AnchoredPopover>;
}
