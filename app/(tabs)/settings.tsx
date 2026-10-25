import { AnchoredPopover,openPopover,PopoverAnchor } from '@/features/AnchoredPopover';
import { HiddenCategories } from '@/features/settings/HiddenCategories';
import { mainTitle } from '@/theme';
import React,{useRef,useState} from 'react';
import { ActivityIndicator,Alert,GestureResponderEvent,Keyboard,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { ThemeMode,useApp } from '@/features/AppProvider';
import { AI_IMPORT_PROMPT } from '@/features/import/aiImportPrompt';
import { exportEntriesCsv,selectExportCategory } from '@/domain/export';
import { assertImportFileSize } from '@/domain/import';
import { language,t } from '@/i18n';

// Expo DocumentPicker owns this cache subdirectory on Android and iOS.
const clearTransferCache=async()=>{
  if(!FileSystem.cacheDirectory)throw new Error('Transfer cache is unavailable');
  for(const name of ['oisiu-export.json','oisiu-export.csv','DocumentPicker'])
    await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${name}`,{idempotent:true});
};

const modes:ThemeMode[]=['system','light','dark'];
const modeIcons:Record<ThemeMode,React.ComponentProps<typeof Ionicons>['name']>={system:'phone-portrait-outline',light:'sunny-outline',dark:'moon-outline'};
const legalBaseUrl=`https://oisiu.github.io/legal/${language==='es'?'es/':''}`;
const externalLinks=[
  {key:'termsConditions',icon:'document-text-outline',url:`${legalBaseUrl}terms.html`},
  {key:'privacyPolicy',icon:'shield-checkmark-outline',url:`${legalBaseUrl}privacy.html`},
  {key:'support',icon:'help-circle-outline',url:`${legalBaseUrl}support.html`},
  {key:'githubRepo',icon:'logo-github',url:'https://github.com/oisiu/mobile-app'},
] as const;
export default function More(){
  const {repo,refresh,habits,entries,palette:c,themeMode,setThemeMode}=useApp();
  const [popoverAnchor,setPopoverAnchor]=useState<PopoverAnchor|null>(null);
  const [showImportGuide,setShowImportGuide]=useState(false),[showAdvanced,setShowAdvanced]=useState(false),[deleting,setDeleting]=useState(false),deletePending=useRef(false);
  const [exportScope,setExportScope]=useState<string[]|null>(null),[exportKind,setExportKind]=useState<'json'|'csv'|null>(null),[exporting,setExporting]=useState(false),exportPending=useRef(false);
  const [importing,setImporting]=useState(false),importPending=useRef(false),importWriting=useRef(false);
  const exportRoots=habits.filter(h=>h.parentId===null&&!h.isGeneral).sort((a,b)=>a.sortOrder-b.sortOrder);
  const openExport=(kind:'json'|'csv')=>{if(!repo||exportPending.current||importPending.current||deletePending.current)return;Keyboard.dismiss();setExportScope(null);setExportKind(kind)};
  const deleteData=()=>{if(!repo||deletePending.current||importPending.current||exportPending.current)return;deletePending.current=true;Keyboard.dismiss();setDeleting(true);const cancel={text:t('cancel'),style:'cancel' as const,onPress:()=>{deletePending.current=false;setDeleting(false)}},options={cancelable:false};
    const erase=async()=>{try{await clearTransferCache();await repo.deleteAllData();await refresh();Alert.alert(t('deleteDataSuccess'))}catch{Alert.alert(t('deleteDataFailed'),t('deleteDataFailedHelp'))}finally{deletePending.current=false;setDeleting(false)}};
    const final=()=>Alert.alert(t('deleteDataFinal'),t('deleteDataFinalHelp',{habits:habits.filter(h=>!h.isGeneral).length,entries:entries.length}),[cancel,{text:t('deleteAllData'),style:'destructive',onPress:()=>void erase()}],options);
    const second=()=>Alert.alert(t('deleteDataSecond'),t('deleteDataSecondHelp'),[cancel,{text:t('continueDelete'),style:'destructive',onPress:final}],options);
    Alert.alert(t('deleteDataFirst'),t('deleteDataFirstHelp'),[cancel,{text:t('continueDelete'),style:'destructive',onPress:second}],options);
  };
  const share=async(kind:'json'|'csv')=>{
    if(!repo||exportPending.current||importPending.current||deletePending.current)return;
    exportPending.current=true;setExporting(true);
    try{
      await clearTransferCache();
      try{
        const snapshot=await repo.export(),data=selectExportCategory(snapshot,exportScope);
        const content=kind==='json'?JSON.stringify(data,null,2):exportEntriesCsv(data);
        const uri=`${FileSystem.cacheDirectory}oisiu-export.${kind}`;
        await FileSystem.writeAsStringAsync(uri,content);
        await Sharing.shareAsync(uri,{mimeType:kind==='json'?'application/json':'text/csv'});
      }finally{await clearTransferCache()}
    }catch{Alert.alert(t('exportFailed'),t('exportFailedHelp'))}
    finally{exportPending.current=false;setExporting(false);setExportKind(null)}
  };
  const importJson=async()=>{
    if(!repo||importPending.current||exportPending.current||deletePending.current)return;
    importPending.current=true;setImporting(true);
    const finish=()=>{importPending.current=false;importWriting.current=false;setImporting(false)};
    try{
      await clearTransferCache();
      const parsed=await (async()=>{
        try{
          const result=await DocumentPicker.getDocumentAsync({type:'application/json',copyToCacheDirectory:true});
          if(result.canceled)return;
          assertImportFileSize(result.assets[0].size);
          const raw=await FileSystem.readAsStringAsync(result.assets[0].uri);assertImportFileSize(raw.length);
          return JSON.parse(raw);
        }finally{await clearTransferCache()}
      })();
      if(parsed===undefined){finish();return}
      Alert.alert(t('importConfirm'),t('importSummary',{habits:parsed.habits?.length??0,entries:parsed.entries?.length??0}),[
        {text:t('cancel'),style:'cancel',onPress:finish},
        {text:t('importAction'),onPress:async()=>{
          if(!importPending.current||importWriting.current)return;
          importWriting.current=true;
          try{await repo.import(parsed);await refresh();Alert.alert(t('importComplete'))}
          catch{Alert.alert(t('importRejected'),t('importFailedHelp'))}
          finally{finish()}
        }},
      ],{cancelable:false});
    }catch{finish();Alert.alert(t('fileReadFailed'),t('fileReadHelp'))}
  };
  const copyPrompt=async()=>{try{await Clipboard.setStringAsync(AI_IMPORT_PROMPT);Alert.alert(t('promptCopied'),t('promptCopiedHelp'))}catch{Alert.alert(t('copyFailed'),t('copyFailedHelp'))}};
  const openLink=async(url:string)=>{try{await Linking.openURL(url)}catch{Alert.alert(t('linkFailed'),t('linkFailedHelp'))}};
  return <><ScrollView style={[s.page,{backgroundColor:c.bg}]} contentContainerStyle={s.content}><View style={{minHeight:48,justifyContent:'center'}}><Text style={[s.title,{color:c.text}]}>{t('settings')}</Text></View><Text accessibilityRole="header" style={[s.sectionTitle,{color:c.text}]}>{t('appearance')}</Text><View accessibilityRole="radiogroup" style={[s.modes,{backgroundColor:c.line}]}>{modes.map(mode=>{const selected=themeMode===mode;return <TouchableOpacity accessibilityRole="radio" accessibilityLabel={t(mode)} accessibilityState={{selected}} key={mode} onPress={()=>void setThemeMode(mode)} style={[s.mode,selected&&{backgroundColor:c.card}]}><Ionicons name={modeIcons[mode]} size={20} color={selected?c.accent:c.muted}/><Text style={{color:selected?c.text:c.muted,fontSize:13,fontWeight:'600',textAlign:'center'}}>{t(mode)}</Text></TouchableOpacity>})}</View><Text accessibilityRole="header" style={[s.sectionTitle,{color:c.text}]}>{t('data')}</Text><Text style={[s.intro,{color:c.muted}]}>{t('dataPrivacy')}</Text><View style={[s.card,{backgroundColor:c.card}]}><Action icon="document-text-outline" label={t('exportJson')} disabled={exporting||importing||deleting||!repo} onPress={event=>openPopover(event,anchor=>{setPopoverAnchor(anchor);openExport('json')})} color={c.text}/><Action icon="grid-outline" label={t('exportCsv')} disabled={exporting||importing||deleting||!repo} onPress={event=>openPopover(event,anchor=>{setPopoverAnchor(anchor);openExport('csv')})} color={c.text}/><Action icon="download-outline" label={t('importJson')} disabled={importing||exporting||deleting||!repo} onPress={importJson} color={c.accent}/><Action icon="sparkles-outline" label={t('convertExport')} onPress={event=>openPopover(event,anchor=>{setPopoverAnchor(anchor);setShowImportGuide(true)})} color={c.text}/></View><Text style={[s.note,{color:c.muted}]}>{t('safeMergeHelp')}</Text><HiddenCategories/><Text accessibilityRole="header" style={[s.sectionTitle,{color:c.text}]}>{t('helpAbout')}</Text><View style={[s.card,{backgroundColor:c.card}]}>{externalLinks.map(link=><Action key={link.key} icon={link.icon} label={t(link.key)} onPress={()=>void openLink(link.url)} color={c.text} external/>)}</View><Text style={[s.note,{color:c.muted}]}>{t('poweredBy')}</Text><View style={[s.advanced,{backgroundColor:c.card}]}><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('advancedSettings')} accessibilityState={{expanded:showAdvanced}} onPress={()=>setShowAdvanced(value=>!value)} style={s.action}><View style={s.actionLabel}><Ionicons name="options-outline" size={20} color={c.muted}/><Text style={{color:c.text,fontSize:16,fontWeight:'600',flexShrink:1}}>{t('advancedSettings')}</Text></View><Ionicons name={showAdvanced?'chevron-up':'chevron-down'} size={18} color={c.muted}/></TouchableOpacity>{showAdvanced&&<View style={s.advancedContent}><Text style={[s.intro,{color:c.muted}]}>{t('advancedSettingsHelp')}</Text><TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:deleting||importing||exporting||!repo,busy:deleting}} disabled={deleting||importing||exporting||!repo} accessibilityLabel={t('deleteAllData')} onPress={deleteData} style={[s.deleteData,{borderColor:c.danger,opacity:deleting?.5:1}]}>{deleting?<ActivityIndicator color={c.danger}/>:<Ionicons name="trash-outline" size={16} color={c.danger}/>}<Text style={{color:c.danger,fontSize:14,fontWeight:'600',flexShrink:1}}>{t('deleteAllData')}</Text></TouchableOpacity></View>}</View></ScrollView>{exportKind&&<AnchoredPopover visible anchor={popoverAnchor} c={c} maxWidth={390} maxHeight={580} onClose={()=>{if(!exportPending.current)setExportKind(null)}}><Text accessibilityRole="header" style={[s.guideTitle,{color:c.text}]}>{t(exportKind==='json'?'exportJson':'exportCsv')}</Text><Text style={[s.guideIntro,{color:c.muted}]}>{t('exportScopeHelp')}</Text><ScrollView style={{flexShrink:1}}>{[{id:null,name:t('exportAllHabits')},...exportRoots.map(h=>({id:h.id,name:`${h.emoji} ${h.name}${h.archivedAt?` (${t('exportArchived')})`:''}`}))].map(option=>{const checked=option.id===null?exportScope===null:exportScope?.includes(option.id)===true;return <TouchableOpacity key={option.id===null?'all':`category:${option.id}`} accessibilityRole="checkbox" accessibilityLabel={option.name} accessibilityState={{checked,disabled:exporting}} disabled={exporting} onPress={()=>{if(exportPending.current)return;const id=option.id;if(id===null)setExportScope(null);else setExportScope(current=>current?.includes(id)?current.filter(value=>value!==id):[...(current??[]),id])}} style={{minHeight:48,flexDirection:'row',alignItems:'center',gap:12}}><Ionicons name={checked?'checkbox':'square-outline'} size={22} color={c.accent}/><Text style={{color:c.text,fontSize:16,flex:1}}>{option.name}</Text></TouchableOpacity>})}</ScrollView><View style={s.guideActions}><TouchableOpacity accessibilityRole="button" disabled={exporting} onPress={()=>setExportKind(null)} style={[s.guideButton,{backgroundColor:c.soft}]}><Text style={{color:c.text,fontWeight:'700'}}>{t('cancel')}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('exportSelected')} accessibilityState={{disabled:exporting||exportScope?.length===0,busy:exporting}} disabled={exporting||exportScope?.length===0} onPress={()=>void share(exportKind)} style={[s.guideButton,{backgroundColor:c.accent,opacity:exportScope?.length===0?.5:1}]}>{exporting?<ActivityIndicator color={c.onAccent}/>:<Text style={{color:c.onAccent,fontWeight:'700'}}>{t('exportSelected')}</Text>}</TouchableOpacity></View></AnchoredPopover>}<AnchoredPopover visible={showImportGuide} anchor={popoverAnchor} c={c} maxWidth={390} maxHeight={620} fillHeight onShow={()=>Keyboard.dismiss()} onClose={()=>setShowImportGuide(false)}><Text style={[s.guideTitle,{color:c.text}]}>{t('convertData')}</Text><Text style={[s.guideIntro,{color:c.muted}]}>{t('convertGuide')}</Text><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={[s.promptBox,{borderColor:c.line,backgroundColor:c.bg}]}><Text selectable style={[s.prompt,{color:c.text}]}>{AI_IMPORT_PROMPT}</Text></ScrollView><View style={s.guideActions}><TouchableOpacity accessibilityRole="button" onPress={()=>setShowImportGuide(false)} style={[s.guideButton,{backgroundColor:c.soft}]}><Text style={{color:c.text,fontWeight:'800'}}>{t('close')}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={()=>{Keyboard.dismiss();void copyPrompt()}} style={[s.guideButton,{backgroundColor:c.accent}]}><Text style={{color:c.onAccent,fontWeight:'600'}}>{t('copyPrompt')}</Text></TouchableOpacity></View></AnchoredPopover></>;
}
function Action({icon,label,onPress,color,external=false,disabled=false}:{icon:React.ComponentProps<typeof Ionicons>['name'];label:string;onPress:(event?:GestureResponderEvent)=>void;color:string;external?:boolean;disabled?:boolean}){return <TouchableOpacity accessibilityRole={external?"link":"button"} accessibilityHint={external?t('opensBrowser'):undefined} onPress={onPress} disabled={disabled} accessibilityState={{disabled}} style={[s.action,{opacity:disabled?.5:1}]}><View style={s.actionLabel}><Ionicons name={icon} size={20} color={color}/><Text style={{color,fontSize:16,flexShrink:1}}>{label}</Text></View><Ionicons name={external?"open-outline":"chevron-forward"} size={18} color={color}/></TouchableOpacity>}
const s=StyleSheet.create({page:{flex:1},content:{padding:20,paddingTop:12,paddingBottom:40},title:{...mainTitle,marginBottom:2},sectionTitle:{fontSize:15,fontWeight:'600',marginTop:28,marginBottom:10},intro:{lineHeight:21,marginBottom:12},modes:{flexDirection:'row',padding:4,borderRadius:18},mode:{flex:1,minHeight:64,paddingVertical:8,paddingHorizontal:4,gap:5,borderRadius:14,alignItems:'center',justifyContent:'center'},card:{borderRadius:18,overflow:'hidden'},action:{minHeight:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#8885'},actionLabel:{flex:1,flexDirection:'row',alignItems:'center',gap:12,paddingRight:12},note:{marginTop:14,lineHeight:20},advanced:{marginTop:28,borderRadius:18,overflow:'hidden'},advancedContent:{padding:16},deleteData:{alignSelf:'flex-start',maxWidth:'100%',minHeight:44,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},guideTitle:{fontSize:24,fontWeight:'700',letterSpacing:-0.4},guideIntro:{lineHeight:20,marginTop:8,marginBottom:14},promptBox:{flexShrink:1,minHeight:0,borderWidth:1,borderRadius:14,padding:14},prompt:{fontFamily:'monospace',fontSize:12,lineHeight:18},guideActions:{flexDirection:'row',gap:10,marginTop:14},guideButton:{flex:1,minHeight:48,borderRadius:14,alignItems:'center',justifyContent:'center'}});
