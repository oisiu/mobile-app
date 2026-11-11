import type { Habit } from '@/domain/types';
import type { PopoverAnchor } from '@/features/AnchoredPopover';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRef,useState,type ReactNode } from 'react';
import { TouchableOpacity,View } from 'react-native';
import { s,skeleton,type Palette } from './detailStyles';

type ChartTitle='score'|'calendar'|'history'|'bestStreaks'|'frequency';
type FilterHandler=(anchor?:PopoverAnchor)=>void;
type ChartHeaderProps={
  chart:ChartTitle;
  label:string;
  onFilter:FilterHandler;
  c:Palette;
  headerControl?:ReactNode;
  loading?:boolean;
};
const chartHelp={
  score:'consistencyInfo',
  history:'historyInfo',
  bestStreaks:'streaksInfo',
  frequency:'frequencyInfo',
} as const;

export function ChartHeader({chart,label,onFilter,c,headerControl,loading=false}:ChartHeaderProps){
  const [open,setOpen]=useState(false);
  const title=t(chart);
  const filter=<FilterButton label={label} onPress={onFilter} c={c} expandedWidth={!!headerControl}/>;

  return <View>
    <View style={[s.sectionHeader,headerControl?{flexWrap:'wrap'}:undefined]}>
      <View style={{flexDirection:'row',alignItems:'center',flexShrink:1,gap:2}}>
        <Text accessibilityRole="header" style={[s.sectionTitle,{color:c.text}]}>{title}</Text>
        {chart!=='calendar'&&<TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('chartInfo',{name:title})}
          accessibilityState={{expanded:open}}
          onPress={()=>setOpen(value=>!value)}
          style={{width:44,minHeight:44,alignItems:'flex-start',paddingLeft:4,justifyContent:'center'}}>
          <Ionicons style={{height:20,lineHeight:20}} name={open?'chevron-up':'information-circle-outline'}
            size={17} color={open?c.accent:c.muted}/>
        </TouchableOpacity>}
      </View>
      {loading
        ?<View importantForAccessibility="no-hide-descendants" style={[skeleton.skeletonPill,{backgroundColor:c.soft,flexShrink:1}]}/>
        :headerControl
          ?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:10,flexShrink:1,marginLeft:'auto'}}>
            {filter}{headerControl}
          </View>
          :filter
      }
    </View>
    {chart!=='calendar'&&open&&<Text style={{color:c.muted,fontSize:14,lineHeight:21,marginTop:8}}>
      {t(chartHelp[chart])}
    </Text>}
  </View>;
}

type FilterButtonProps={label:string;onPress:FilterHandler;c:Palette;expandedWidth?:boolean};
function FilterButton({label,onPress,c,expandedWidth=false}:FilterButtonProps){
  const trigger=useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const open=()=>{
    if(trigger.current){
      trigger.current.measureInWindow((x,y,width,height)=>onPress({x,y,width,height}));
    }else onPress();
  };
  return <TouchableOpacity ref={trigger} accessibilityRole="button" onPress={open}
    style={[s.filterButton,{backgroundColor:c.soft},expandedWidth&&{maxWidth:undefined,flexShrink:1}]}>
    <Text numberOfLines={1} style={[s.filterButtonText,{color:c.accent}]}>{label}</Text>
  </TouchableOpacity>;
}

type HeaderProps={chart:ChartTitle;habit?:Habit;onFilter:FilterHandler;c:Palette};
export function Header({chart,habit,onFilter,c}:HeaderProps){
  const label=habit?`${habit.emoji} ${habit.name}`:'';
  return <ChartHeader chart={chart} label={label} onFilter={onFilter} c={c}/>;
}

export function ChartCard({chart,label,onFilter,c,children,headerControl,loading=false}:ChartHeaderProps & {children:ReactNode}){
  return <View style={[s.card,{backgroundColor:c.card},chart==='score'&&{minHeight:360}]}>
    <ChartHeader chart={chart} label={label} onFilter={onFilter} c={c} headerControl={headerControl} loading={loading}/>
    {children}
  </View>;
}
