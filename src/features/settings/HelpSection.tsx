import { useApp } from '@/features/AppProvider';
import { language,t } from '@/i18n';
import { Text } from '@/theme/Typography';
import * as Linking from 'expo-linking';
import { Alert,View } from 'react-native';
import { SettingsAction } from './SettingsAction';
import { settingsStyles as s } from './settingsStyles';

const legalBaseUrl=`https://oisiu.github.io/legal/${language==='es'?'es/':''}`;
const externalLinks=[
  {key:'termsConditions',icon:'document-text-outline',url:`${legalBaseUrl}terms.html`},
  {key:'privacyPolicy',icon:'shield-checkmark-outline',url:`${legalBaseUrl}privacy.html`},
  {key:'support',icon:'help-circle-outline',url:`${legalBaseUrl}support.html`},
  {key:'githubRepo',icon:'logo-github',url:'https://github.com/oisiu/mobile-app'},
] as const;
export function HelpSection(){
  const {palette:c}=useApp();
  const openLink=async(url:string)=>{
    try{await Linking.openURL(url)}catch{Alert.alert(t('linkFailed'),t('linkFailedHelp'))}
  };
  return <>
    <Text accessibilityRole="header" style={[s.sectionTitle,{color:c.text}]}>{t('helpAbout')}</Text>
    <View style={[s.card,{backgroundColor:c.card}]}>
      {externalLinks.map(link=><SettingsAction key={link.key} icon={link.icon} label={t(link.key)}
        onPress={()=>void openLink(link.url)} color={c.text} external/>)}
    </View>
    <Text style={[s.note,{color:c.muted}]}>{t('poweredBy')}</Text>
  </>;
}
