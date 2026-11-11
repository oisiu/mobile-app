import type { Habit } from '@/domain/types';
import { AnchoredPopover } from '@/features/AnchoredPopover';
import { SuccessToast } from '@/features/AppProvider';
import { SheetHandle } from '@/features/SheetHandle';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { FlatList,TouchableOpacity,View } from 'react-native';
import { CalendarDayRow } from './CalendarDayRow';
import { CalendarValueEditor } from './CalendarValueEditor';
import { s,type Palette } from './calendarStyles';
import type { CalendarDayHabit } from './useCalendarData';
import type { CalendarDayEditor } from './useCalendarDayEditor';

type Props={state:CalendarDayEditor;habits:Habit[];dayHabits:CalendarDayHabit[];dayTotals:Map<string,number>;c:Palette};
export function CalendarDaySheet({state,habits,dayHabits,dayTotals,c}:Props){
  const {selectedDate,editor,saving,refreshOnly}=state;
  const heading=selectedDate&&new Intl.DateTimeFormat(undefined,{
    weekday:'long',day:'numeric',month:'long',year:'numeric',
  }).format(new Date(`${selectedDate}T12:00:00`));
  return <AnchoredPopover visible={!!selectedDate} anchor={state.popoverAnchor} c={c}
    maxWidth={390} maxHeight={620} fillHeight onClose={state.closeSheet} onEscape={state.goBack}
    footer={<SuccessToast bottom={18}/>}>
    <SheetHandle onClose={state.closeSheet} disabled={saving}/>
    <View style={s.sheetHeader}>
      <View style={{flex:1}}>
        <Text style={[s.sheetTitle,{color:c.text}]}>{heading}</Text>
        {!editor&&<Text style={[s.sheetHint,{color:c.muted}]}>{t('dayEditorHint')}</Text>}
      </View>
    </View>
    {refreshOnly&&<Text style={[s.editorHint,{color:c.muted}]}>{t('entrySavedRefreshHelp')}</Text>}
    {refreshOnly&&!editor&&<TouchableOpacity disabled={saving} accessibilityRole="button" onPress={state.retry}
      style={[s.saveButton,{backgroundColor:c.accent}]}>
      <Text style={[s.saveText,{color:c.onAccent}]}>{t('retry')}</Text>
    </TouchableOpacity>}
    {editor
      ?<CalendarValueEditor state={state} habits={habits} c={c}/>
      :<FlatList style={s.habitList} contentContainerStyle={s.habitListContent} data={dayHabits}
        keyExtractor={({habit})=>habit.id} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={7}
        renderItem={({item})=><CalendarDayRow item={item} value={dayTotals.get(item.habit.id)??0} habits={habits} state={state} c={c}/>}/>
    }
  </AnchoredPopover>;
}
