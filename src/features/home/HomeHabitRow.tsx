import { HOME_VISIBLE_DAYS } from './dateWindow';
import type { Habit,HabitNode } from '@/domain/types';
import { t } from '@/i18n';
import { depthBackground } from '@/theme';
import { Text } from '@/theme/Typography';
import { habitAccent } from '@/theme/habitColors';
import { Ionicons } from '@expo/vector-icons';
import { memo,type Dispatch,type SetStateAction } from 'react';
import { Animated,TouchableOpacity,View } from 'react-native';
import { CategoryDragHandle } from './CategoryDragHandle';
import { HomeDayCells } from './HomeDayCells';
import type { HomeHabitItem } from './homeMatrix';
import { s,type Palette } from './homeStyles';
import type { useHomeOrdering } from './useHomeOrdering';

type Props={
  item:HomeHabitItem;tree:HabitNode[];habits:Habit[];expanded:Set<string>;setExpanded:Dispatch<SetStateAction<Set<string>>>;
  ordering:ReturnType<typeof useHomeOrdering>;pending:string|null;push:(href:string)=>void;
  today:string;c:Palette;chunks:string[][];dayWidth:number;historyDays:number;start:number;end:number;
  dateTrackX:ReturnType<typeof Animated.multiply>;values:Map<string,string>|undefined;
  onToggle:(habit:HabitNode,date:string)=>void;onBranch:(habit:HabitNode,date:string)=>void;
};
export const HomeHabitRow=memo(function HomeHabitRow({item,tree,habits,expanded,setExpanded,ordering,pending,push,today,c,chunks,dayWidth,historyDays,start,end,dateTrackX,values,onToggle,onBranch}:Props){
  const {habit:h,depth,rootId,groupEnd}=item,{drag}=ordering;
  const backgroundColor=depthBackground(c.card,c.soft,depth);
  const href=`/insight/${h.id}`;
  return <View style={[s.habitGroup,{backgroundColor:c.card,marginBottom:groupEnd?6:0,
    ...(drag&&rootId===drag.id?{transform:[{translateY:drag.dy}],zIndex:10,elevation:4,opacity:.9}:{}),
    ...(drag&&depth===0&&tree[drag.target]?.id===h.id&&drag.id!==h.id?{borderTopWidth:2,borderTopColor:c.accent}:{}),
  }]}>
    <View style={[s.row,{backgroundColor,marginBottom:0}]}>
      <View style={[s.frozenLabel,{backgroundColor}]}>
        {depth===0&&tree.length>1&&<CategoryDragHandle name={h.name} color={c.muted} disabled={ordering.ordering||pending!==null}
          onStart={()=>ordering.startDrag(h.id)} onMove={ordering.moveDrag} onEnd={ordering.finishDrag} onCancel={ordering.cancelDrag}
          onStep={direction=>void ordering.reorder(h.id,Math.max(0,Math.min(tree.length-1,tree.findIndex(item=>item.id===h.id)+direction)))}/>
        }
        <View pointerEvents="none" style={{position:'absolute',left:0,top:4,bottom:4,width:3,backgroundColor:habitAccent(h,habits,'transparent')}}/>
        <TouchableOpacity disabled={pending!==null} accessibilityRole="button" accessibilityLabel={`${t('openInsights')} ${h.name}`}
          accessibilityState={{busy:pending===href,disabled:pending!==null}} onPress={()=>push(href)}
          style={[s.label,{paddingLeft:(depth===0&&tree.length>1?0:20)+Math.min(depth,4)*6}]}>
          <Text style={s.emoji}>{h.emoji}</Text>
          <Text numberOfLines={1} style={[s.name,{color:c.text,fontSize:13-Math.min(depth,4)}]}>{h.name}</Text>
        </TouchableOpacity>
        {h.children.length>0&&<TouchableOpacity accessibilityLabel={`${h.name}, ${expanded.has(h.id)?t('collapse'):t('expand')}`}
          onPress={()=>setExpanded(current=>{const next=new Set(current);if(next.has(h.id))next.delete(h.id);else next.add(h.id);return next})} style={s.expand}>
          <Ionicons name={expanded.has(h.id)?'chevron-up':'chevron-down'} size={17} color={c.muted}/>
        </TouchableOpacity>}
      </View>
      <View style={[s.dateViewport,{width:dayWidth*HOME_VISIBLE_DAYS}]}>
        <Animated.View style={[s.dateTrack,{width:historyDays*dayWidth,transform:[{translateX:dateTrackX}]}]}>
          <View style={{width:start*dayWidth}}/>
          {chunks.map(dates=><HomeDayCells key={dates[0]} habit={h} dates={dates} values={values} today={today} c={c}
            dayWidth={dayWidth} onToggle={onToggle} onBranch={onBranch}/>)}
          <View style={{width:(historyDays-end)*dayWidth}}/>
        </Animated.View>
      </View>
    </View>
  </View>;
});
