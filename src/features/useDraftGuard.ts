import { useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation,usePreventRemove } from 'expo-router/react-navigation';
import { t } from '@/i18n';

export function useDraftGuard(dirty:boolean,busy?:{current:boolean}){
  const navigation=useNavigation(),allowed=useRef(false),prompting=useRef(false);
  usePreventRemove(dirty||!!busy?.current,({data})=>{
    if(allowed.current){navigation.dispatch(data.action);return}
    if(busy?.current||prompting.current)return;
    prompting.current=true;
    Alert.alert(t('discardTitle'),t('discardMessage'),[
      {text:t('keepEditing'),style:'cancel',onPress:()=>{prompting.current=false}},
      {text:t('discard'),style:'destructive',onPress:()=>{prompting.current=false;navigation.dispatch(data.action)}},
    ],{cancelable:true,onDismiss:()=>{prompting.current=false}});
  });
  return ()=>{allowed.current=true};
}
