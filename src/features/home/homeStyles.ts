import { dark,light,mainTitle } from '@/theme';
import { StyleSheet } from 'react-native';
import { HABIT_COLUMN_WIDTH } from './dateWindow';

export type Palette=typeof light|typeof dark;
export const s=StyleSheet.create({
  page:{flex:1,paddingTop:12},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  brand:mainTitle,
  header:{minHeight:48,paddingLeft:20,paddingRight:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  add:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center'},
  week:{width:'100%',flexDirection:'row',minHeight:64,paddingVertical:14},
  dateHeader:{flexGrow:0,flexShrink:0},
  timeline:{flex:1},
  habitList:{flex:1},
  habitGroup:{marginBottom:6},
  frozenLabel:{width:HABIT_COLUMN_WIDTH,flexDirection:'row',zIndex:2},
  dateLabelSpacer:{width:HABIT_COLUMN_WIDTH,paddingHorizontal:20,justifyContent:'center'},
  dateViewport:{height:52,flexGrow:0,flexShrink:0,overflow:'hidden'},
  dateTrack:{height:52,flexDirection:'row',alignItems:'center'},
  day:{alignItems:'center',justifyContent:'center',gap:4},
  dayNum:{fontWeight:'700'},
  row:{width:'100%',height:52,marginBottom:6,flexDirection:'row',alignItems:'center'},
  label:{flex:1,minWidth:0,minHeight:48,flexDirection:'row',alignItems:'center',gap:4,paddingRight:4},
  expand:{width:28,minHeight:48,alignItems:'center',justifyContent:'center'},
  emoji:{fontSize:18},
  name:{fontSize:13,fontWeight:'600',flex:1,minWidth:0},
  cell:{minHeight:48,alignItems:'center',justifyContent:'center'},
  cellText:{fontSize:12,fontWeight:'600'},
  empty:{alignSelf:'stretch',textAlign:'center',paddingVertical:24},
});
