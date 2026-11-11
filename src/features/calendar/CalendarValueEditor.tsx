import type { DurationUnit } from '@/domain/entries';
import type { Habit } from '@/domain/types';
import { t } from '@/i18n';
import { Text,TextInput } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView,TouchableOpacity,View } from 'react-native';
import { s,type Palette } from './calendarStyles';
import type { CalendarDayEditor } from './useCalendarDayEditor';

type Props={state:CalendarDayEditor;habits:Habit[];c:Palette};
export function CalendarValueEditor({state,habits,c}:Props){
  const {editor,locked,saving,hasRecord,refreshOnly}=state;
  if(!editor)return null;
  const hasChildren=habits.some(habit=>habit.parentId===editor.habit.id&&!habit.isGeneral);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.valueEditor}>
    <TouchableOpacity disabled={saving} accessibilityRole="button" onPress={state.goBack} style={s.editorBack}>
      <Ionicons name="chevron-back" size={18} color={c.accent}/>
      <Text style={{color:c.accent,fontWeight:'700'}}>{t('back')}</Text>
    </TouchableOpacity>
    <Text style={[s.editorTitle,{color:c.text}]}>{editor.habit.emoji} {editor.habit.name}</Text>
    {hasChildren&&<Text style={[s.editorHint,{color:c.muted}]}>{t('ownRecordHint')}</Text>}
    {editor.habit.type==='duration'&&<View style={s.units}>
      {(['minutes','hours'] as DurationUnit[]).map(unit=><TouchableOpacity key={unit} disabled={locked}
        accessibilityRole="radio" accessibilityState={{checked:editor.unit===unit}}
        onPress={()=>state.changeUnit(unit)} style={[s.unit,{backgroundColor:editor.unit===unit?c.accent:c.soft}]}>
        <Text style={{color:editor.unit===unit?c.onAccent:c.text,fontWeight:'700'}}>{t(unit)}</Text>
      </TouchableOpacity>)}
    </View>}
    <TextInput autoFocus editable={!locked} accessibilityLabel={t('value')} keyboardType="decimal-pad" inputMode="decimal"
      value={editor.value} onChangeText={state.changeValue} placeholder={t('value')} placeholderTextColor={c.muted}
      style={[s.input,{borderColor:c.line,color:c.text}]}/>
    <View style={s.editorActions}>
      {hasRecord&&<TouchableOpacity disabled={locked} accessibilityRole="button" onPress={state.deleteEntry}
        style={[s.deleteButton,{backgroundColor:c.soft}]}>
        <Ionicons name="trash-outline" size={18} color={c.danger}/>
        <Text style={{color:c.danger,fontWeight:'700'}}>{t('deleteEntry')}</Text>
      </TouchableOpacity>}
      <TouchableOpacity disabled={saving} accessibilityRole="button" accessibilityState={{busy:saving,disabled:saving}}
        onPress={()=>void state.save()} style={[s.saveButton,{backgroundColor:c.accent,opacity:saving?.5:1}]}>
        <Text style={[s.saveText,{color:c.onAccent}]}>{t(refreshOnly?'retry':'save')}</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>;
}
