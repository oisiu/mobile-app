import { habitNameLimit } from '@/domain/habitName';
import type { HabitType } from '@/domain/types';
import { CalendarThresholdInput } from '@/features/CalendarThresholdInput';
import { HabitColorPicker } from '@/features/HabitColorPicker';
import { HabitNameCounter } from '@/features/HabitNameCounter';
import { t } from '@/i18n';
import { Text,TextInput } from '@/theme/Typography';
import type { ReactNode } from 'react';
import { TouchableOpacity,View } from 'react-native';
import { ChildAddActions,ChildReorderActions } from './ChildActions';
import type { DraftNode } from './draftTree';
import { s } from './editorStyles';
import type { Palette } from './editorTypes';

type DraftRowProps={
  type:HabitType;
  node:DraftNode;
  depth:number;
  siblingIndex:number;
  siblingCount:number;
  c:Palette;
  onChange:(key:string,patch:Partial<Pick<DraftNode,'name'|'emoji'|'color'|'calendarThreshold'>>)=>void;
  onAdd:(key:string)=>void;
  onRemove:(node:DraftNode)=>void;
  onReorder:(key:string,direction:-1|1)=>void;
  existing:(node:DraftNode)=>ReactNode;
  canRemove:(node:DraftNode)=>boolean;
  isAttachment:(node:DraftNode)=>boolean;
};
export function DraftRow({node,depth,siblingIndex,siblingCount,c,type,onChange,onAdd,onRemove,onReorder,existing,canRemove,isAttachment}:DraftRowProps){
  return <View style={{marginLeft:(Math.min(depth,4)-Math.min(Math.max(0,depth-1),4))*14}}>
    <HabitColorPicker value={node.color??null} onChange={color=>onChange(node.key,{color})} c={c}>
      {colorButton=><View>
        <View style={[s.childRow,{borderColor:c.line}]}>
          <TextInput value={node.emoji} onChangeText={emoji=>onChange(node.key,{emoji})} accessibilityLabel={t('habitEmoji')}
            accessibilityHint={t('emojiHelp')} style={[s.childEmoji,{backgroundColor:c.card,color:c.text}]}/>
          <TextInput value={node.name} onChangeText={name=>onChange(node.key,{name})} accessibilityLabel={t('habitName')}
            accessibilityHint={t('habitNameLimitHelp',{limit:habitNameLimit})} placeholder={t('habitName')}
            placeholderTextColor={c.muted} style={[s.childName,{backgroundColor:c.card,color:c.text}]}/>
          {colorButton}
          {canRemove(node)&&<TouchableOpacity accessibilityLabel={isAttachment(node)?t('cancelCategoryMove',{name:node.name}):`${t('delete')} ${node.name}`}
            onPress={()=>onRemove(node)} style={s.rowButton}>
            <Text style={{color:c.danger,fontSize:18}}>×</Text>
          </TouchableOpacity>}
        </View>
        <HabitNameCounter name={node.name} c={c}/>
        <ChildReorderActions name={node.name} siblingIndex={siblingIndex} siblingCount={siblingCount} onReorder={direction=>onReorder(node.key,direction)} c={c}/>
      </View>}
    </HabitColorPicker>
    <CalendarThresholdInput key={type} type={type} value={node.calendarThreshold}
      onChange={calendarThreshold=>onChange(node.key,{calendarThreshold})} c={c} name={node.name}/>
    <ChildAddActions onAdd={()=>onAdd(node.key)} existing={existing(node)} c={c} nested/>
    {node.children.map((child,index)=><DraftRow type={type} key={child.key} node={child} depth={depth+1} siblingIndex={index} siblingCount={node.children.length} c={c}
      onChange={onChange} onAdd={onAdd} onRemove={onRemove} onReorder={onReorder} existing={existing} canRemove={canRemove} isAttachment={isAttachment}/>
    )}
  </View>;
}

