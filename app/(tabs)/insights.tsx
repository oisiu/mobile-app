import { mainTitle } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator,ScrollView,StyleSheet,Text,TouchableOpacity,View } from 'react-native';
import { formatValue } from '@/domain/aggregation';
import { todayLocal } from '@/domain/entries';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { buildInsightsOverview } from '@/domain/insightsOverview';
import { usePrefetchRoutes,useResponsiveNavigation } from '@/features/useResponsiveNavigation';

export default function Insights(){
  const {habits,entries,palette:c}=useApp(),{elapsedDays,ranked}=buildInsightsOverview(habits,entries,todayLocal()),navigation=useResponsiveNavigation();
  usePrefetchRoutes(ranked.map(item=>`/insight/${item.habit.id}`));
  return <ScrollView style={[s.page,{backgroundColor:c.bg}]} contentContainerStyle={s.content}>
    <View style={{minHeight:48,justifyContent:'center'}}><Text style={[s.title,{color:c.text}]}>{t('insights')}</Text></View><Text style={[s.intro,{color:c.muted}]}>{t('insightsRankingIntro')}</Text>
    <View style={[s.list,{backgroundColor:c.card}]}>{ranked.map((item,index)=>{const href=`/insight/${item.habit.id}`,pending=navigation.pending===href;return <TouchableOpacity disabled={navigation.pending!==null} accessibilityRole="button" accessibilityLabel={`${t('openInsights')} ${item.habit.name}`} accessibilityState={{busy:pending,disabled:navigation.pending!==null}} onPress={()=>navigation.push(href)} key={item.habit.id} activeOpacity={.78} style={[s.row,index>0&&{borderTopColor:c.line,borderTopWidth:StyleSheet.hairlineWidth}]}>
      <Text style={[s.rank,{color:c.muted}]}>{index+1}</Text><View style={[s.emojiBubble,{backgroundColor:c.soft}]}><Text style={s.emoji}>{item.habit.emoji}</Text></View><View style={s.copy}><View style={s.rowTop}><Text numberOfLines={1} style={[s.habit,{color:c.text}]}>{item.habit.name}</Text><Text style={[s.score,{color:c.accent}]}>{item.active}/{elapsedDays}</Text></View><View style={[s.track,{backgroundColor:c.soft}]}><View style={[s.fill,{backgroundColor:c.accent,width:`${item.active/elapsedDays*100}%`}]}/></View><Text style={[s.meta,{color:c.muted}]}>{t('activeDays')}: {item.active} · {t('total')}: {formatValue(item.habit.type,item.total)}</Text></View>
      {pending?<ActivityIndicator size="small" color={c.accent}/>:<Ionicons name="chevron-forward" size={18} color={c.muted}/>}
    </TouchableOpacity>})}{!ranked.length&&<Text style={[s.empty,{color:c.muted}]}>{t('empty')}</Text>}</View>
  </ScrollView>;
}

const s=StyleSheet.create({page:{flex:1},content:{padding:20,paddingTop:12,paddingBottom:40},title:{...mainTitle},intro:{fontSize:15,lineHeight:21,marginTop:5,maxWidth:340,marginBottom:20},list:{borderRadius:24,paddingHorizontal:15},row:{minHeight:92,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14},rank:{width:16,fontSize:12,fontWeight:'800',textAlign:'center'},emojiBubble:{width:42,height:42,borderRadius:15,alignItems:'center',justifyContent:'center'},emoji:{fontSize:22},copy:{flex:1},rowTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},habit:{fontSize:16,fontWeight:'800',flex:1},score:{fontSize:13,fontWeight:'900'},track:{height:5,borderRadius:3,overflow:'hidden',marginTop:8},fill:{height:'100%',borderRadius:3},meta:{fontSize:10,fontWeight:'600',marginTop:6},empty:{textAlign:'center',padding:30}})
