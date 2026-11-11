import { AnchoredPopover,type PopoverAnchor } from '@/features/AnchoredPopover';
import { useApp } from '@/features/AppProvider';
import { AI_IMPORT_PROMPT } from '@/features/import/aiImportPrompt';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import * as Clipboard from 'expo-clipboard';
import { Alert,Keyboard,ScrollView,TouchableOpacity,View } from 'react-native';
import { settingsStyles as s } from './settingsStyles';

export function ImportGuidePopover({visible,anchor,onClose}:{visible:boolean;anchor:PopoverAnchor|null;onClose:()=>void}){
  const {palette:c}=useApp();
  const copyPrompt=async()=>{
    try{await Clipboard.setStringAsync(AI_IMPORT_PROMPT);Alert.alert(t('promptCopied'),t('promptCopiedHelp'))}
    catch{Alert.alert(t('copyFailed'),t('copyFailedHelp'))}
  };
  return <AnchoredPopover visible={visible} anchor={anchor} c={c} maxWidth={390} maxHeight={620} fillHeight
    onShow={()=>Keyboard.dismiss()} onClose={onClose}>
    <Text style={[s.guideTitle,{color:c.text}]}>{t('convertData')}</Text>
    <Text style={[s.guideIntro,{color:c.muted}]}>{t('convertGuide')}</Text>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      style={[s.promptBox,{borderColor:c.line,backgroundColor:c.bg}]}>
      <Text selectable style={[s.prompt,{color:c.text}]}>{AI_IMPORT_PROMPT}</Text>
    </ScrollView>
    <View style={s.guideActions}>
      <TouchableOpacity accessibilityRole="button" onPress={onClose} style={[s.guideButton,{backgroundColor:c.soft}]}>
        <Text style={{color:c.text,fontWeight:'800'}}>{t('close')}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={()=>{Keyboard.dismiss();void copyPrompt()}} style={[s.guideButton,{backgroundColor:c.accent}]}>
        <Text style={{color:c.onAccent,fontWeight:'600'}}>{t('copyPrompt')}</Text>
      </TouchableOpacity>
    </View>
  </AnchoredPopover>;
}
