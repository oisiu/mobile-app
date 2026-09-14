import { mainTitle } from '@/theme';
import { calendarExpandedGroups } from '@/domain/calendarExpansion';
import { Ionicons } from '@expo/vector-icons';
import React,{useMemo,useRef,useState} from 'react';
import { Alert,FlatList,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View } from 'react-native';
import { DurationUnit,durationInputToSeconds,isCompleteDecimalInput,sanitizeDecimalInput,todayLocal } from '@/domain/entries';
import { aggregate,aggregationIndex,formatValue } from '@/domain/aggregation';
import { Habit,HabitNode } from '@/domain/types';
import { buildTree,topLevelAncestor } from '@/domain/tree';
import { SuccessToast,useApp } from '@/features/AppProvider';
import { SheetHandle } from '@/features/SheetHandle';
import { t } from '@/i18n';
import { addMonths,monthCalendarDays,monthKey } from '@/utils/dates';

const weekLabels=Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(undefined,{weekday:'narrow'}).format(new Date(2024,0,1+i)));
type ValueEditor={habit:Habit;value:string;unit:DurationUnit};

export default function Calendar(){
  const {habits,entries,changeEntry,palette:c}=useApp(),today=todayLocal(),currentMonth=monthKey(today),[monthCount,setMonthCount]=useState(12),[width,setWidth]=useState(0),[selectedDate,setSelectedDate]=useState<string|null>(null),[editor,setEditor]=useState<ValueEditor|null>(null),[expanded,setExpanded]=useState<Set<string>>(new Set()),[saving,setSaving]=useState(false);
  const savingRef=useRef(false);
  const dayHabits=useMemo(()=>{const rows:{habit:HabitNode;depth:number}[]=[];const visit=(habit:HabitNode,depth:number)=>{rows.push({habit,depth});if(expanded.has(habit.id))habit.children.forEach(child=>visit(child,depth+1))};buildTree(habits).forEach(root=>visit(root,0));return rows},[habits,expanded]);
  const entryIndex=useMemo(()=>aggregationIndex(habits,entries),[habits,entries]);
  const directTargets=useMemo(()=>new Map(habits.map(habit=>[habit.id,habits.find(item=>item.parentId===habit.id&&item.isGeneral)?.id??habit.id])),[habits]);
  const rootByHabit=useMemo(()=>new Map(habits.map(habit=>[habit.id,topLevelAncestor(habits,habit.id)])),[habits]);
  const categoriesByDay=useMemo(()=>{const result=new Map<string,{id:string;emoji:string}[]>(),seen=new Map<string,Set<string>>();for(const entry of entries){const category=rootByHabit.get(entry.habitId);if(!category)continue;let daySeen=seen.get(entry.localDate);if(!daySeen){daySeen=new Set();seen.set(entry.localDate,daySeen)}if(daySeen.has(category.id))continue;daySeen.add(category.id);const values=result.get(entry.localDate)??[];values.push({id:category.id,emoji:category.emoji});result.set(entry.localDate,values)}return result},[entries,rootByHabit]);
  const list=useRef<FlatList<string>>(null),visibleIndex=useRef(0);
  const dayHeight=Math.max(64,Math.min(82,(width-32)/7*1.2));
  const months=useMemo(()=>Array.from({length:monthCount},(_,index)=>addMonths(currentMonth,-index)),[currentMonth,monthCount]);
  const layouts=useMemo(()=>{let offset=0;return months.map((month,index)=>{const length=76+monthCalendarDays(month).length/7*dayHeight;const layout={index,length,offset};offset+=length;return layout})},[months,dayHeight]);
  const moveMonth=(amount:number)=>{const index=Math.max(0,Math.min(months.length-1,visibleIndex.current-amount));list.current?.scrollToIndex({index,animated:true})};

  const targetId=(habit:Habit)=>directTargets.get(habit.id)??habit.id;
  const valueOn=(habit:Habit,date:string)=>entryIndex.value(targetId(habit),date);
  const openEditor=(habit:Habit)=>{if(!selectedDate||savingRef.current)return;const current=valueOn(habit,selectedDate),unit:DurationUnit=habit.type==='duration'&&current>=3600&&current%3600===0?'hours':'minutes';setEditor({habit,unit,value:entryIndex.has(targetId(habit),selectedDate)?String(habit.type==='duration'?current/(unit==='hours'?3600:60):current):''})};
  const toggleExpanded=(id:string)=>{if(savingRef.current)return;setExpanded(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next})};
  const closeSheet=()=>{if(savingRef.current)return;setEditor(null);setSelectedDate(null)};
  const goBack=()=>{if(savingRef.current)return;if(editor)setEditor(null);else closeSheet()};
  const persist=async(value:number|null,habit=editor?.habit)=>{
    if(!selectedDate||!habit||savingRef.current)return;
    savingRef.current=true;setSaving(true);
    try{await changeEntry(habit.id,selectedDate,value);setEditor(null)}
    catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
    finally{savingRef.current=false;setSaving(false)}
  };
  const save=async()=>{if(!editor)return;if(!isCompleteDecimalInput(editor.value))return Alert.alert(t('invalidNumber'));const input=Number(editor.value),value=editor.habit.type==='duration'?durationInputToSeconds(input,editor.unit):input;if(!Number.isFinite(value)||value<0||(editor.habit.type==='duration'&&!Number.isInteger(value)))return Alert.alert(t('invalidNumber'));await persist(value)};
  const hasRecord=!!editor&&!!selectedDate&&entryIndex.has(targetId(editor.habit),selectedDate);
  const dayTotals=useMemo(()=>new Map(dayHabits.map(({habit})=>[habit.id,selectedDate?aggregate(habits,entries,habit.id,new Set([selectedDate])):0])),[dayHabits,habits,entries,selectedDate]);
  return <View style={[s.page,{backgroundColor:c.bg}]} onLayout={event=>setWidth(event.nativeEvent.layout.width)}>
    <View style={s.content}><View style={s.heading}><Text style={[s.title,{color:c.text}]}>{t('calendar')}</Text><TouchableOpacity accessibilityRole="button" onPress={()=>list.current?.scrollToOffset({offset:0,animated:true})} style={[s.todayButton,{backgroundColor:c.soft}]}><Ionicons name="today-outline" size={17} color={c.accent}/><Text style={{color:c.accent,fontWeight:'700'}}>{t('today')}</Text></TouchableOpacity></View>
      <View style={s.weekRow}>{weekLabels.map((label,index)=><View key={index} style={s.weekday}><Text style={[s.weekdayText,{color:c.muted}]}>{label}</Text></View>)}</View>
    </View>
    {width>0&&<FlatList ref={list} inverted data={months} keyExtractor={month=>month} contentContainerStyle={s.monthList}
      showsVerticalScrollIndicator={false} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={5}
      getItemLayout={(_,index)=>layouts[index]} onEndReached={()=>setMonthCount(count=>count+12)} onEndReachedThreshold={1}
      onScroll={event=>{const offset=event.nativeEvent.contentOffset.y;visibleIndex.current=Math.max(0,layouts.findIndex(item=>item.offset+item.length>offset))}} scrollEventThrottle={32}
      accessibilityHint={t('swipeCalendarVertical')} accessibilityActions={[{name:'increment',label:t('nextMonth')},{name:'decrement',label:t('previousMonth')}]}
      onAccessibilityAction={event=>moveMonth(event.nativeEvent.actionName==='increment'?1:-1)}
      renderItem={({item:month})=><View style={s.monthBlock}>
        <View style={s.monthHeading}><Text accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.4} style={[s.month,{color:c.text}]}>{new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(new Date(`${month}-15T12:00:00`))}</Text><View style={[s.monthRule,{backgroundColor:c.line}]}/></View>
        <View style={s.grid}>{monthCalendarDays(month).map((date,index)=>{if(!date)return <View key={`blank-${index}`} style={[s.daySlot,{height:dayHeight}]}/>;const future=date>today,isToday=date===today,categories=categoriesByDay.get(date)??[];return <View key={date} style={[s.daySlot,{height:dayHeight}]}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('editDay')} ${date}, ${categories.length} ${t('categoryMarks')}`} disabled={future} onPress={()=>{setExpanded(calendarExpandedGroups(habits,entries,date));setEditor(null);setSelectedDate(date)}} activeOpacity={.75} style={[s.day,{backgroundColor:isToday?c.accent:c.card,borderColor:categories.length&&!isToday?c.soft:'transparent'},future&&s.disabled]}><Text style={[s.dayNumber,{color:isToday?c.onAccent:c.text}]}>{Number(date.slice(-2))}</Text><View style={s.emojis}>{categories.slice(0,3).map(category=><Text key={category.id} style={s.emoji}>{category.emoji}</Text>)}{categories.length>3&&<Text style={[s.more,{color:isToday?c.onAccent:c.muted}]}>+{categories.length-3}</Text>}</View></TouchableOpacity></View>})}</View>
      </View>}/>}
    <Modal transparent visible={!!selectedDate} animationType="slide" onRequestClose={goBack}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <Pressable style={s.overlay} onPress={closeSheet}><Pressable style={[s.sheet,{backgroundColor:c.card}]} onAccessibilityEscape={goBack} onPress={()=>undefined}>
        <SheetHandle onClose={closeSheet} disabled={saving}/><View style={s.sheetHeader}><View style={{flex:1}}>
          <Text style={[s.sheetTitle,{color:c.text}]}>{selectedDate&&new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${selectedDate}T12:00:00`))}</Text>
          {!editor&&<Text style={[s.sheetHint,{color:c.muted}]}>{t('dayEditorHint')}</Text>}
        </View></View>
        {editor?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.valueEditor}>
          <TouchableOpacity disabled={saving} accessibilityRole="button" onPress={goBack} style={s.editorBack}><Ionicons name="chevron-back" size={18} color={c.accent}/><Text style={{color:c.accent,fontWeight:'700'}}>{t('back')}</Text></TouchableOpacity>
          <Text style={[s.editorTitle,{color:c.text}]}>{editor.habit.emoji} {editor.habit.name}</Text>
          {habits.some(habit=>habit.parentId===editor.habit.id&&!habit.isGeneral)&&<Text style={[s.editorHint,{color:c.muted}]}>{t('ownRecordHint')}</Text>}
            {editor.habit.type==='duration'&&<View style={s.units}>{(['minutes','hours'] as DurationUnit[]).map(unit=><TouchableOpacity key={unit} disabled={saving} accessibilityRole="radio" accessibilityState={{checked:editor.unit===unit}} onPress={()=>setEditor(current=>{if(!current||current.unit===unit)return current;const value=isCompleteDecimalInput(current.value)?String(Number(current.value)*(unit==='hours'?1/60:60)):current.value;return {...current,unit,value}})} style={[s.unit,{backgroundColor:editor.unit===unit?c.accent:c.soft}]}><Text style={{color:editor.unit===unit?c.onAccent:c.text,fontWeight:'700'}}>{t(unit)}</Text></TouchableOpacity>)}</View>}
            <TextInput autoFocus editable={!saving} accessibilityLabel={t('value')} keyboardType="decimal-pad" inputMode="decimal" value={editor.value} onChangeText={value=>setEditor(current=>current&&({...current,value:sanitizeDecimalInput(value)}))} placeholder={t('value')} placeholderTextColor={c.muted} style={[s.input,{borderColor:c.line,color:c.text}]}/>
          <View style={s.editorActions}>
            {hasRecord&&<TouchableOpacity disabled={saving} accessibilityRole="button" onPress={()=>void persist(null)} style={[s.deleteButton,{backgroundColor:c.soft}]}><Ionicons name="trash-outline" size={18} color={c.danger}/><Text style={{color:c.danger,fontWeight:'700'}}>{t('deleteEntry')}</Text></TouchableOpacity>}
            <TouchableOpacity disabled={saving} accessibilityRole="button" accessibilityState={{busy:saving,disabled:saving}} onPress={()=>void save()} style={[s.saveButton,{backgroundColor:c.accent,opacity:saving?.5:1}]}><Text style={[s.saveText,{color:c.onAccent}]}>{t('save')}</Text></TouchableOpacity>
          </View>
        </ScrollView>:<FlatList style={s.habitList} contentContainerStyle={s.habitListContent} data={dayHabits} keyExtractor={({habit})=>habit.id} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={7} renderItem={({item:{habit,depth}})=>{const value=dayTotals.get(habit.id)??0,hasChildren=habit.children.length>0,isExpanded=expanded.has(habit.id);return <View style={[s.habitRow,{borderColor:c.line,marginLeft:Math.min(depth,5)*12}]}>
            {hasChildren?<TouchableOpacity disabled={saving} accessibilityRole="button" accessibilityLabel={`${t(isExpanded?'collapse':'expand')} ${habit.name}`} accessibilityState={{expanded:isExpanded}} onPress={()=>toggleExpanded(habit.id)} style={s.rowAction}><Ionicons name={isExpanded?'chevron-down':'chevron-forward'} size={18} color={c.muted}/></TouchableOpacity>:<View style={{width:44}}/>}
            <Pressable accessible={hasChildren} accessibilityRole={hasChildren?"button":undefined} accessibilityLabel={hasChildren?`${t(isExpanded?'collapse':'expand')} ${habit.name}`:undefined} accessibilityState={hasChildren?{expanded:isExpanded,disabled:saving}:undefined} disabled={!hasChildren||saving} onPress={()=>toggleExpanded(habit.id)} style={s.habitMain}>
              <View style={[s.habitEmoji,{backgroundColor:value?c.soft:c.bg}]}><Text style={s.habitEmojiText}>{habit.emoji}</Text></View>
              <View style={s.habitCopy}><Text numberOfLines={1} style={[s.habitName,{color:c.text}]}>{habit.name}</Text>{hasChildren&&<Text style={{color:c.muted,fontSize:11}}>{t('total')}: {formatValue(habit.type,value)}</Text>}</View>
            </Pressable>
            <TouchableOpacity accessibilityRole="button" disabled={saving} accessibilityState={{disabled:saving,busy:saving}} accessibilityLabel={`${habit.name}, ${formatValue(habit.type,selectedDate?valueOn(habit,selectedDate):0)}`} accessibilityHint={hasChildren?t('ownRecordHint'):undefined} onPress={()=>habit.type==='boolean'?void persist(selectedDate&&valueOn(habit,selectedDate)?null:1,habit):openEditor(habit)} style={s.valueAction}>
              <Text style={{color:selectedDate&&valueOn(habit,selectedDate)?c.accent:c.muted,fontWeight:'700'}}>{formatValue(habit.type,selectedDate?valueOn(habit,selectedDate):0)}</Text>
            </TouchableOpacity>
          </View>}}/>}
      </Pressable></Pressable><SuccessToast bottom={18}/>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const s=StyleSheet.create({page:{flex:1},content:{paddingTop:12,paddingHorizontal:16,paddingBottom:6},heading:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:20},todayButton:{minHeight:44,borderRadius:16,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:7},monthList:{paddingHorizontal:16,paddingBottom:24},monthBlock:{paddingBottom:24},monthHeading:{height:52,flexDirection:'row',alignItems:'center',gap:14},monthRule:{height:StyleSheet.hairlineWidth,flex:1},title:{...mainTitle,paddingHorizontal:4},month:{fontSize:19,fontWeight:'700',textTransform:'capitalize',paddingHorizontal:4,flexShrink:1},disabled:{opacity:.28},weekRow:{flexDirection:'row',paddingHorizontal:2},weekday:{width:'14.2857%',alignItems:'center',paddingBottom:8},weekdayText:{fontSize:11,fontWeight:'800',textTransform:'uppercase'},grid:{flexDirection:'row',flexWrap:'wrap'},daySlot:{width:'14.2857%',padding:3},day:{flex:1,borderRadius:13,borderWidth:1.5,padding:4,alignItems:'center',overflow:'hidden'},dayNumber:{fontSize:12,fontWeight:'800'},emojis:{width:'100%',flexShrink:1,minHeight:0,overflow:'hidden',flexDirection:'row',flexWrap:'wrap',justifyContent:'center',marginTop:6,gap:1},emoji:{fontSize:11},more:{fontSize:9,fontWeight:'800',alignSelf:'center'},overlay:{flex:1,backgroundColor:'#0008',justifyContent:'flex-end'},sheet:{maxHeight:'84%',minHeight:'58%',borderTopLeftRadius:28,borderTopRightRadius:28,paddingHorizontal:18,paddingBottom:28},sheetHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:12},sheetTitle:{fontSize:19,fontWeight:'800',textTransform:'capitalize'},sheetHint:{fontSize:12,marginTop:3},habitList:{marginTop:14},habitListContent:{paddingBottom:10},habitRow:{minHeight:62,flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth},habitMain:{flex:1,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:7},habitEmoji:{width:42,height:42,borderRadius:15,alignItems:'center',justifyContent:'center'},habitEmojiText:{fontSize:21},habitCopy:{flex:1},habitName:{fontSize:15,fontWeight:'700'},rowAction:{width:44,height:44,alignItems:'center',justifyContent:'center'},valueAction:{minWidth:44,minHeight:48,paddingHorizontal:10,alignItems:'center',justifyContent:'center'},valueEditor:{paddingTop:12,paddingBottom:16},editorHint:{fontSize:12,lineHeight:18,marginBottom:16},editorBack:{flexDirection:'row',alignItems:'center',minHeight:44,marginBottom:12},editorTitle:{fontSize:21,fontWeight:'800',marginBottom:16},units:{flexDirection:'row',gap:8,marginBottom:12},unit:{paddingHorizontal:15,paddingVertical:9,borderRadius:18},input:{borderWidth:1,borderRadius:14,padding:14,fontSize:21},editorActions:{flexDirection:'row',gap:10,marginTop:18},deleteButton:{flex:1,minHeight:48,borderRadius:16,flexDirection:'row',gap:6,alignItems:'center',justifyContent:'center'},saveButton:{flex:1,minHeight:48,borderRadius:16,alignItems:'center',justifyContent:'center'},saveText:{color:'white',fontWeight:'800'}})
