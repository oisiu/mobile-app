import { mainTitle } from '@/theme';
import { StyleSheet } from 'react-native';

export const settingsStyles=StyleSheet.create({
  page:{flex:1},
  content:{padding:20,paddingTop:12,paddingBottom:40},
  title:{...mainTitle,marginBottom:2},
  sectionTitle:{fontSize:15,fontWeight:'600',marginTop:28,marginBottom:10},
  intro:{lineHeight:21,marginBottom:12},
  modes:{flexDirection:'row',padding:4,borderRadius:18},
  mode:{flex:1,minHeight:64,paddingVertical:8,paddingHorizontal:4,gap:5,borderRadius:14,alignItems:'center',justifyContent:'center'},
  card:{borderRadius:18,overflow:'hidden'},
  action:{minHeight:58,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#8885'},
  actionLabel:{flex:1,flexDirection:'row',alignItems:'center',gap:12,paddingRight:12},
  note:{marginTop:14,lineHeight:20},
  advanced:{marginTop:28,borderRadius:18,overflow:'hidden'},
  advancedContent:{padding:16},
  deleteData:{alignSelf:'flex-start',maxWidth:'100%',minHeight:44,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  guideTitle:{fontSize:24,fontWeight:'700',letterSpacing:-0.4},
  guideIntro:{lineHeight:20,marginTop:8,marginBottom:14},
  promptBox:{flexShrink:1,minHeight:0,borderWidth:1,borderRadius:14,padding:14},
  prompt:{fontSize:12,lineHeight:18},
  guideActions:{flexDirection:'row',gap:10,marginTop:14},
  guideButton:{flex:1,minHeight:48,borderRadius:14,alignItems:'center',justifyContent:'center'},
});
