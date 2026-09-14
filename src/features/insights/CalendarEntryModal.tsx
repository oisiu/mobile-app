import React from 'react';
import { KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View } from 'react-native';
import { CalendarDraft,changeCalendarUnit } from './calendarEntry';
import { Habit } from '@/domain/types';
import { sanitizeDecimalInput } from '@/domain/entries';
import { t } from '@/i18n';
import { light } from '@/theme';
type CalendarEditor=CalendarDraft;
type Palette=typeof light;
const dateLabel=(date:string)=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${date}T12:00:00`));

export function CalendarEntryModal({editor,habit,hasRecord,saving,setEditor,onSave,onClear,c,embedded=false}:{editor:CalendarEditor|null;habit:Habit;hasRecord:boolean;saving:boolean;setEditor:(value:CalendarEditor|null|((current:CalendarEditor|null)=>CalendarEditor|null))=>void;onSave:()=>Promise<void>;onClear:()=>Promise<void>;c:Palette;embedded?:boolean}){
  const close=()=>{if(!saving)setEditor(null)};
  const content = <>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <Pressable style={s.entryOverlay} onPress={close}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{width:'100%',maxWidth:390,flexGrow:0}} contentContainerStyle={{flexGrow:1}}>
          <Pressable accessibilityViewIsModal onAccessibilityEscape={close} style={[s.entryModal,{backgroundColor:c.card}]} onPress={()=>undefined}>
            <Text style={[s.entryDate,{color:c.muted}]}>{editor&&dateLabel(editor.date)}</Text>
            <Text style={[s.entryTitle,{color:c.text}]}>{habit.emoji} {habit.name}</Text>
            <Text style={{color:c.muted}}>{t('ownRecordHint')}</Text>
            {habit.type==='duration'&&editor&&<View style={s.entryUnits}>{(['minutes','hours'] as const).map(unit=><TouchableOpacity key={unit} disabled={saving} accessibilityRole="radio" accessibilityState={{checked:editor.unit===unit,disabled:saving}} onPress={()=>setEditor(value=>value&&changeCalendarUnit(value,unit))} style={[s.entryUnit,{backgroundColor:editor.unit===unit?c.accent:c.soft}]}><Text style={{color:editor.unit===unit?'white':c.text,fontWeight:'700'}}>{t(unit)}</Text></TouchableOpacity>)}</View>}
            {editor&&<TextInput autoFocus editable={!saving} accessibilityLabel={habit.type==='duration'?t(editor.unit):t('value')} keyboardType="decimal-pad" inputMode="decimal" value={editor.value} onChangeText={value=>setEditor(current=>current&&({...current,value:sanitizeDecimalInput(value)}))} placeholder={t('value')} placeholderTextColor={c.muted} style={[s.entryInput,{borderColor:c.line,color:c.text}]}/>}
            <View style={s.entryActions}>
              <TouchableOpacity disabled={saving} accessibilityRole="button" onPress={close} style={[s.entryAction,{backgroundColor:c.soft}]}><Text style={{color:c.text,fontWeight:'800'}}>{t('cancel')}</Text></TouchableOpacity>
              {hasRecord&&<TouchableOpacity disabled={saving} accessibilityRole="button" onPress={()=>void onClear()} style={[s.entryAction,{backgroundColor:c.soft}]}><Text style={{color:c.danger,fontWeight:'800'}}>{t('deleteEntry')}</Text></TouchableOpacity>}
              <TouchableOpacity disabled={saving} accessibilityRole="button" accessibilityState={{busy:saving,disabled:saving}} onPress={()=>void onSave()} style={[s.entryAction,{backgroundColor:c.accent}]}><Text style={{color:'white',fontWeight:'800'}}>{t('save')}</Text></TouchableOpacity>
            </View>
          </Pressable>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  </>;
  return embedded?content:<Modal transparent visible={!!editor} animationType="fade" onRequestClose={close}>{content}</Modal>;
}

const s=StyleSheet.create({entryOverlay:{flex:1,backgroundColor:'#0008',alignItems:'center',justifyContent:'center',padding:24},entryModal:{width:'100%',maxWidth:390,borderRadius:22,padding:22,gap:12},entryDate:{fontSize:12,fontWeight:'700',textTransform:'capitalize'},entryTitle:{fontSize:18,fontWeight:'800'},entryUnits:{flexDirection:'row',gap:8},entryUnit:{paddingHorizontal:14,paddingVertical:9,borderRadius:18},entryInput:{borderWidth:1,borderRadius:12,padding:14,fontSize:20},entryActions:{flexDirection:'row',justifyContent:'flex-end',gap:10,marginTop:4},entryAction:{minHeight:44,borderRadius:15,paddingHorizontal:16,alignItems:'center',justifyContent:'center'}});
