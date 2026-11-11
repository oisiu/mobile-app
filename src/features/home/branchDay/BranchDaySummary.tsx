import { formatValue } from '@/domain/aggregation';
import type { Habit } from '@/domain/types';
import { t } from '@/i18n';
import type { light } from '@/theme';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { Pressable,View } from 'react-native';
import { branchRecordLabel } from './BranchRecordEditor';
import { styles as s } from './branchDayStyles';
import type { BranchConflict } from './useBranchDayEditor';

export function formatBranchDate(value:string){
  return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`));
}
export function BranchDayPreview({habit,original,total,invalid,moving,c}:{habit:Habit;original:number;total:number;invalid:boolean;moving:boolean;c:typeof light}){
  return <View accessibilityLiveRegion="polite" style={[s.preview,{backgroundColor:c.soft}]}>
    <View>
      <Text style={{color:c.muted,fontSize:11}}>{t('branchBefore')}</Text>
      <Text style={[s.previewValue,{color:c.text}]}>{formatValue(habit.type,original)}</Text>
    </View>
    <Ionicons name="arrow-forward" size={20} color={c.muted}/>
    <View>
      <Text style={{color:c.muted,fontSize:11}}>{t('branchAfter')}</Text>
      <Text style={[s.previewValue,{color:c.accent}]}>{invalid?'…':formatValue(habit.type,moving?0:total)}</Text>
    </View>
  </View>;
}
export function BranchMoveSummary({target,count,locked,onKeepDate,c}:{target:string;count:number;locked:boolean;onKeepDate:()=>void;c:typeof light}){
  return <View style={[s.row,{backgroundColor:c.soft,padding:12,borderRadius:12}]}>
    <Ionicons name="calendar-outline" size={20} color={c.accent}/>
    <View style={{flex:1}}>
      <Text style={{color:c.text,fontWeight:'600'}}>{formatBranchDate(target)}</Text>
      <Text style={{color:c.muted,fontSize:12}}>{t('branchMovingCount',{count})}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('branchKeepDate')} disabled={locked} onPress={onKeepDate} style={{padding:10}}>
      <Ionicons name="close" color={c.muted} size={18}/>
    </Pressable>
  </View>;
}
export function BranchConflicts({habit,records,c}:{habit:Habit;records:BranchConflict[];c:typeof light}){
  return <View accessibilityLiveRegion="polite" style={{gap:8}}>
    <Text style={{color:c.danger}}>{t('branchConflictShort')}</Text>
    {records.map(record=><View key={record.entry.id} style={s.row}>
      <Text style={{fontSize:20}}>{record.habit.isGeneral?(record.path[record.path.length-2]??record.habit).emoji:record.habit.emoji}</Text>
      <Text style={{color:c.text,flex:1}}>{branchRecordLabel(record.path)}</Text>
      <Text style={{color:c.text}}>{formatValue(habit.type,record.destinationValue)}</Text>
    </View>)}
  </View>;
}
