import { habitNameError,habitNameLimit } from '@/domain/habitName';
import { HabitNameCounter } from '@/features/HabitNameCounter';
import { HabitTypeChange,validHistoryValue } from '@/domain/habitTypeChange';
import { HabitTypeConversion } from '@/features/HabitTypeConversion';
import { CalendarDraft,calendarInputValue } from '@/features/insights/calendarEntry';
import { makeId } from '@/utils/id';
import { TreeAttachment } from '@/domain/treeAttachments';
import { CalendarThresholdInput } from '@/features/CalendarThresholdInput';
import { isValidCalendarThreshold } from '@/domain/calendarThreshold';
import { MoveHabitPicker } from '@/features/MoveHabitPicker';
import { HabitColorPicker } from '@/features/HabitColorPicker';
import { HabitColor,isSingleEmoji } from '@/domain/habitAppearance';
import { useHabitMutation } from '@/features/useHabitMutation';
import { useDraftGuard } from '@/features/useDraftGuard';
import React,{useRef,useState} from 'react';
import { ActivityIndicator,Alert,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View } from 'react-native';
import { router,useLocalSearchParams } from 'expo-router';
import { Entry,Habit,HabitNode,HabitType } from '@/domain/types';
import { buildTree,descendants,topLevelAncestor } from '@/domain/tree';
import { TreeDraftCreate,TreeDraftUpdate } from '@/data/repository';
import { useApp } from '@/features/AppProvider';
import { language,t } from '@/i18n';
import { dark,light } from '@/theme';

const types:HabitType[]=['boolean','number','duration'];
type Palette=typeof light|typeof dark;
type DraftNode={key:string;id?:string;name:string;emoji:string;color:Habit['color'];calendarThreshold:number|null;children:DraftNode[]};
const draftKey=makeId;
const fromNode=(node:HabitNode):DraftNode=>({key:node.id,id:node.id,name:node.name,emoji:node.emoji,color:node.color??null,calendarThreshold:node.calendarThreshold??null,children:node.children.map(fromNode)});
const changeNode=(items:DraftNode[],key:string,patch:Partial<Pick<DraftNode,'name'|'emoji'|'color'|'calendarThreshold'>>):DraftNode[]=>items.map(item=>item.key===key?{...item,...patch}:{...item,children:changeNode(item.children,key,patch)});
const invalidThresholds=(nodes:DraftNode[],type:HabitType):boolean=>nodes.some(node=>!isValidCalendarThreshold(type,node.calendarThreshold)||invalidThresholds(node.children,type));
const addNode=(items:DraftNode[],parentKey:string,node:DraftNode,first=false):DraftNode[]=>items.map(item=>item.key===parentKey?{...item,children:first?[node,...item.children]:[...item.children,node]}:{...item,children:addNode(item.children,parentKey,node,first)});
const dropNode=(items:DraftNode[],key:string):DraftNode[]=>items.filter(item=>item.key!==key).map(item=>({...item,children:dropNode(item.children,key)}));
const attachmentPositions=(nodes:DraftNode[],moves:TreeAttachment[]):TreeAttachment[]=>{const indices=new Map<string,number>();const visit=(items:DraftNode[])=>items.forEach((item,index)=>{indices.set(item.key,index);visit(item.children)});visit(nodes);return moves.map(move=>({...move,index:indices.get(move.id)!}))};
const nodeKeys=(nodes:DraftNode[]):string[]=>nodes.flatMap(node=>[node.key,...nodeKeys(node.children)]);
const draftPath=(nodes:DraftNode[],key:string):string[]|null=>{for(const node of nodes){const name=node.name.trim()||t('newCategory');if(node.key===key)return [name];const child=draftPath(node.children,key);if(child)return [name,...child]}return null};
const flatten=(items:DraftNode[],parentKey:string,updates:TreeDraftUpdate[],creates:TreeDraftCreate[])=>{for(const [index,item] of items.entries()){if(item.id)updates.push({id:item.id,name:item.name,emoji:item.emoji,color:item.color,calendarThreshold:item.calendarThreshold});else creates.push({key:item.key,parentKey,index,name:item.name,emoji:item.emoji,color:item.color,calendarThreshold:item.calendarThreshold});flatten(item.children,item.key,updates,creates)}};

export default function HabitEditor(){
  const {id}=useLocalSearchParams<{id:string}>(),isNew=id==='new',{ready,habits,entries,repo,refresh,showSuccess,palette:c}=useApp();
  if(!ready)return <View style={[s.center,{backgroundColor:c.bg}]}><ActivityIndicator color={c.accent}/></View>;
  if(isNew)return <NewRoot habits={habits} c={c} repo={repo} refresh={refresh} showSuccess={showSuccess}/>;
  const root=topLevelAncestor(habits,id);
  if(!root)return <View style={[s.center,{backgroundColor:c.bg}]}><Text style={{color:c.text}}>{t('categoryNotFound')}</Text></View>;
  return <TreeEditor key={root.id} root={root} habits={habits} entries={entries} repo={repo} refresh={refresh} showSuccess={showSuccess} c={c}/>;
}

function OverviewVisibility({value,onChange,c,complete=false}:{value:boolean;onChange:(value:boolean)=>void;c:Palette;complete?:boolean}){return <TouchableOpacity accessibilityRole="switch" accessibilityLabel={t(complete?'hideCompletely':'hideFromOverview')} accessibilityHint={t(complete?'hideCompletelyHelp':'hideFromOverviewHelp')} accessibilityState={{checked:value}} onPress={()=>onChange(!value)} style={{flexDirection:'row',alignItems:'center',gap:12,padding:16,marginTop:20,borderRadius:14,backgroundColor:c.card}}><View style={{flex:1}}><Text style={{color:c.text,fontWeight:'600'}}>{t(complete?'hideCompletely':'hideFromOverview')}</Text><Text style={{color:c.muted,fontSize:12,marginTop:5}}>{t(complete?'hideCompletelyHelp':'hideFromOverviewHelp')}</Text></View><Text style={{color:value?c.accent:c.muted,fontSize:24}}>{value?'☑':'☐'}</Text></TouchableOpacity>}

function NewRoot({habits,c,repo,refresh,showSuccess}:{habits:Habit[];c:Palette;repo:ReturnType<typeof useApp>['repo'];refresh:()=>Promise<void>;showSuccess:(message:string)=>void}){
  const [isHidden,setIsHidden]=useState(false),[hideFromOverview,setHideFromOverview]=useState(false),[name,setName]=useState(''),[emoji,setEmoji]=useState('✨'),[type,setType]=useState<HabitType>('boolean'),[color,setColor]=useState<HabitColor|null>('green'),[calendarThreshold,setCalendarThreshold]=useState<number|null>(null);
  const [rootKey]=useState(draftKey);
  const [nodes,setNodes]=useState<DraftNode[]>([]),[moves,setMoves]=useState<TreeAttachment[]>([]);
  const add=(parentKey?:string)=>{const node:DraftNode={key:draftKey(),name:'',emoji:'✨',color:null,calendarThreshold:null,children:[]};setNodes(current=>parentKey?addNode(current,parentKey,node,true):[node,...current])};
  const attach=(habit:HabitNode,parentKey:string)=>{setNodes(current=>parentKey===rootKey?[...current,fromNode(habit)]:addNode(current,parentKey,fromNode(habit)));setMoves(current=>[...current,{id:habit.id,parentKey,expectedParentId:habit.parentId}])};
  const remove=(node:DraftNode)=>{if(node.id&&!moves.some(move=>move.id===node.id))return;const keys=new Set([node.key,...nodeKeys(node.children)]);setNodes(current=>dropNode(current,node.key));setMoves(current=>current.filter(move=>!keys.has(move.id)))};
  const excluded=new Set(nodeKeys(nodes));
  const mutation=useHabitMutation(refresh);
  const allowLeave=useDraftGuard(nodes.length>0||name!==''||emoji!=='✨'||type!=='boolean'||color!=='green'||hideFromOverview||isHidden||calendarThreshold!==null,mutation.pending);
  const save=async()=>{
    try{
      if(mutation.needsRefresh){await mutation.retry();return}
      if(!repo)return;
      const nameError=habitNameError(name);if(nameError)return Alert.alert(t(nameError,{limit:habitNameLimit}));
      if(!isSingleEmoji(emoji))return Alert.alert(t('invalidEmoji'));
      if(!isValidCalendarThreshold(type,calendarThreshold))return Alert.alert(t('invalidCalendarThreshold'));
      const input={name,emoji,color,...(calendarThreshold!==null?{calendarThreshold}:{}),type,parentId:null,...(hideFromOverview?{hideFromOverview:true}:{}),...(isHidden?{isHidden:true}:{})};
      const updates:TreeDraftUpdate[]=[],creates:TreeDraftCreate[]=[];
      flatten(nodes,rootKey,updates,creates);
      const childNameError=[...updates.map(item=>habitNameError(item.name,habits.find(h=>h.id===item.id)?.name)),...creates.map(item=>habitNameError(item.name))].find(Boolean);if(childNameError)return Alert.alert(t(childNameError,{limit:habitNameLimit}));
      if(invalidThresholds(nodes,type))return Alert.alert(t('invalidCalendarThreshold'));
      if(creates.some(item=>!isSingleEmoji(item.emoji))||updates.some(item=>item.emoji!==habits.find(h=>h.id===item.id)?.emoji&&!isSingleEmoji(item.emoji)))return Alert.alert(t('invalidEmoji'));
      await mutation.run(()=>nodes.length?repo.createTree(input,updates,creates,attachmentPositions(nodes,moves),rootKey):repo.create(input),()=>{allowLeave();showSuccess(t('habitCreated',{name:`${emoji} ${name.trim()}`.trim()}));router.dismissTo('/(tabs)')});
    }catch(error){Alert.alert(t('couldNotSave'),moves.length?t('categoryMoveFailedHelp'):error instanceof Error?error.message:String(error))}
  };
  return <Screen c={c} title={t('add')} onSave={save} busy={mutation.busy} locked={mutation.needsRefresh}><HabitInputs name={name} emoji={emoji} color={color??null} onName={setName} onEmoji={setEmoji} onColor={setColor} moveControl={<MoveHabitPicker habits={habits} type={type} excluded={excluded} parentName={name} onSelect={habit=>attach(habit,rootKey)} c={c}/>} c={c}/><Text style={[s.label,{color:c.muted}]}>{t('type')}</Text><View style={s.pills}>{types.map(item=><TouchableOpacity key={item} onPress={()=>{if(item!==type){setNodes([]);setMoves([])}setType(item);setCalendarThreshold(null)}} style={[s.pill,{backgroundColor:type===item?c.accent:c.card}]}><Text style={{color:type===item?'white':c.text}}>{t(item)}</Text><Text style={{color:type===item?'white':c.muted,fontSize:12,marginTop:4,fontWeight:'700'}}>{t(`${item}Example`)}</Text></TouchableOpacity>)}</View><CalendarThresholdInput key={type} type={type} value={calendarThreshold} onChange={setCalendarThreshold} c={c} name={name}/><OverviewVisibility value={hideFromOverview} onChange={setHideFromOverview} c={c}/><OverviewVisibility value={isHidden} onChange={setIsHidden} c={c} complete/><View style={s.sectionHeader}><Text style={[s.label,{color:c.muted,marginTop:0}]}>{t('children')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('addChild')} onPress={()=>add()} style={[s.plus,{backgroundColor:c.accent}]}><Text style={s.plusText}>＋</Text></TouchableOpacity></View>{nodes.map(node=><DraftRow type={type} key={node.key} node={node} depth={0} c={c} onChange={(key,patch)=>setNodes(current=>changeNode(current,key,patch))} onAdd={add} onRemove={remove} isAttachment={node=>moves.some(move=>move.id===node.id)} canRemove={node=>!node.id||moves.some(move=>move.id===node.id)} existing={node=><MoveHabitPicker habits={habits} type={type} excluded={excluded} parentName={node.name} parentPath={[name.trim()||t('newCategory'),...draftPath(nodes,node.key)??[]].join(' / ')} onSelect={habit=>attach(habit,node.key)} c={c}/>}/>)}</Screen>;
}

function TreeEditor({root,habits,entries,repo,refresh,showSuccess,c}:{root:Habit;habits:Habit[];entries:Entry[];repo:ReturnType<typeof useApp>['repo'];refresh:()=>Promise<void>;showSuccess:(message:string)=>void;c:Palette}){
  const [type,setType]=useState(root.type),[historyDraft,setHistoryDraft]=useState<CalendarDraft>({date:'',value:'',unit:'minutes'});
  const mutation=useHabitMutation(refresh),savingRef=useRef(false),confirming=useRef(false);
  const [reviewing,setReviewing]=useState(false);
  const thresholdBackup=useRef<{root:number|null;values:Map<string,number|null>}|null>(null);
  const [moves,setMoves]=useState<TreeAttachment[]>([]);
  const [isHidden,setIsHidden]=useState(!!root.isHidden),[hideFromOverview,setHideFromOverview]=useState(!!root.hideFromOverview);
  const rootNode=buildTree(habits).find(item=>item.id===root.id),[name,setName]=useState(root.name),[emoji,setEmoji]=useState(root.emoji),[color,setColor]=useState(root.color??null),[calendarThreshold,setCalendarThreshold]=useState(root.calendarThreshold??null),[nodes,setNodes]=useState<DraftNode[]>(()=>rootNode?.children.map(fromNode)??[]),[deletedIds,setDeletedIds]=useState<string[]>([]);
  const [initial]=useState(()=>JSON.stringify({type:root.type,name:root.name,emoji:root.emoji,color:root.color??null,calendarThreshold:root.calendarThreshold??null,hideFromOverview:!!root.hideFromOverview,isHidden:!!root.isHidden,nodes:rootNode?.children.map(fromNode)??[]}));
  const dirty=JSON.stringify({type,name,emoji,color,calendarThreshold,hideFromOverview,isHidden,nodes})!==initial||!isValidCalendarThreshold(type,calendarThreshold)||invalidThresholds(nodes,type);
  const allowLeave=useDraftGuard(dirty,{get current(){return savingRef.current||mutation.pending.current||confirming.current}});
  const historicalIds=new Set([root.id,...descendants(habits,root.id).map(h=>h.id)]),hasHistory=entries.some(entry=>historicalIds.has(entry.habitId));
  const blank=():DraftNode=>({key:draftKey(),name:'',emoji:'✨',color:null,calendarThreshold:null,children:[]});
  const add=(parentKey?:string)=>setNodes(current=>parentKey?addNode(current,parentKey,blank(),true):[blank(),...current]);
  const excluded=new Set([root.id,...nodeKeys(rootNode?.children.map(fromNode)??[]),...nodeKeys(nodes)]);
  const attach=(habit:HabitNode,parentKey:string)=>{setNodes(current=>parentKey===root.id?[...current,fromNode(habit)]:addNode(current,parentKey,fromNode(habit)));setMoves(current=>[...current,{id:habit.id,parentKey,expectedParentId:habit.parentId}])};
  const remove=async(node:DraftNode)=>{
    if(savingRef.current||mutation.pending.current||confirming.current)return;
    if(moves.some(move=>move.id===node.id)){const keys=new Set([node.key,...nodeKeys(node.children)]);setNodes(current=>dropNode(current,node.key));setMoves(current=>current.filter(move=>!keys.has(move.id)));return}const commit=()=>{const keys=new Set([node.key,...nodeKeys(node.children)]);setNodes(current=>dropNode(current,node.key));setMoves(current=>current.filter(move=>!keys.has(move.id)));if(node.id)setDeletedIds(current=>[...current,node.id!])};
    if(!node.id)return commit();
    if(!repo)return;
    confirming.current=true;setReviewing(true);
    try{
      const impact=await repo.deletionImpact(node.id);
      const confirmed=await new Promise<boolean>(resolve=>Alert.alert(`${t('delete')} “${node.name}”?`,t('deletionSummary',{habits:impact.habits,entries:impact.entries}),[
        {text:t('cancel'),style:'cancel',onPress:()=>resolve(false)},
        {text:t('delete'),style:'destructive',onPress:()=>resolve(true)},
      ],{cancelable:true,onDismiss:()=>resolve(false)}));
      if(confirmed)commit();
    }catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
    finally{confirming.current=false;setReviewing(false)}
  };
  const changeType=(next:HabitType)=>{
    if(next===type)return;
    const remaining=moves.reduce((items,move)=>dropNode(items,move.id),nodes);
    const visit=(items:DraftNode[],values:Map<string,number|null>)=>{for(const item of items){values.set(item.key,item.calendarThreshold);visit(item.children,values)}};
    const thresholds=(items:DraftNode[],values?:Map<string,number|null>):DraftNode[]=>items.map(item=>({...item,calendarThreshold:values?.get(item.key)??null,children:thresholds(item.children,values)}));
    if(type===root.type){const values=new Map<string,number|null>();visit(remaining,values);thresholdBackup.current={root:calendarThreshold,values}}
    if(next===root.type){setCalendarThreshold(thresholdBackup.current?.root??null);setNodes(thresholds(remaining,thresholdBackup.current?.values));thresholdBackup.current=null}
    else{setCalendarThreshold(null);setNodes(thresholds(remaining))}
    setMoves([]);setType(next);setHistoryDraft({date:'',value:'',unit:'minutes'});
  };
  const save=async()=>{
    try{
      if(mutation.needsRefresh){await mutation.retry();return}
      if(confirming.current||mutation.pending.current)return;
      if(!repo)return;
      const nameError=habitNameError(name,root.name);if(nameError)return Alert.alert(t(nameError,{limit:habitNameLimit}));
      const updates:TreeDraftUpdate[]=[{id:root.id,name,emoji,color,calendarThreshold,...(hideFromOverview!==!!root.hideFromOverview?{hideFromOverview}:{}),...(isHidden!==!!root.isHidden?{isHidden}:{})}],creates:TreeDraftCreate[]=[];
      flatten(nodes,root.id,updates,creates);
      if([...updates,...creates].some(item=>!isValidCalendarThreshold(type,item.calendarThreshold)))return Alert.alert(t('invalidCalendarThreshold'));
      const childNameError=[...updates.map(item=>habitNameError(item.name,habits.find(h=>h.id===item.id)?.name)),...creates.map(item=>habitNameError(item.name))].find(Boolean);if(childNameError)return Alert.alert(t(childNameError,{limit:habitNameLimit}));
      if(updates.some(item=>item.emoji!==habits.find(h=>h.id===item.id)?.emoji&&!isSingleEmoji(item.emoji))||creates.some(item=>!isSingleEmoji(item.emoji)))return Alert.alert(t('invalidEmoji'));
      let conversion:HabitTypeChange|undefined;
      if(type!==root.type){
        const measureType=root.type==='boolean'?type:'duration',value=type==='boolean'?undefined:calendarInputValue({...root,type:measureType},historyDraft);
        if(hasHistory&&type!=='boolean'&&!validHistoryValue(measureType,value,root.type==='boolean'))return Alert.alert(t(root.type==='boolean'?'invalidHistoryValue':'invalidUnitDuration'));
        const branch=[root,...descendants(habits,root.id)],ids=new Set(branch.map(h=>h.id));
        conversion={from:root.type,to:type,expectedHabitIds:[...ids],expectedEntries:entries.filter(entry=>ids.has(entry.habitId)),...(root.type==='boolean'?{trueValue:value??undefined}:type!=='boolean'?{unitDurationSeconds:value??undefined}:{})};
        const formattedValue=new Intl.NumberFormat(language,{maximumFractionDigits:20,useGrouping:false}).format(Number(historyDraft.value));
        const valueLabel=measureType==='duration'?formattedValue+' '+t(historyDraft.unit).toLocaleLowerCase(language):formattedValue;
        const message=t(!hasHistory?'confirmEmptyHistory':type==='boolean'?'confirmBooleanConversion':root.type==='boolean'?'confirmBooleanHistory':'confirmNumericHistory',{name,habits:branch.filter(h=>!h.isGeneral).length,records:conversion.expectedEntries.length,type:t(type),value:valueLabel});
        const confirmed=await new Promise<boolean>(resolve=>Alert.alert(t('confirmHabitTypeChange'),message,[{text:t('cancel'),style:'cancel',onPress:()=>resolve(false)},{text:t('convertAndSave'),style:'destructive',onPress:()=>resolve(true)}],{cancelable:true,onDismiss:()=>resolve(false)}));
        if(!confirmed)return;
      }
      await mutation.run(async()=>{
      if(conversion)await repo.editTree(root.id,updates,creates,deletedIds,attachmentPositions(nodes,moves),conversion);
      else if(moves.length)await repo.editTree(root.id,updates,creates,deletedIds,attachmentPositions(nodes,moves));
      else await repo.editTree(root.id,updates,creates,deletedIds);
      },()=>{allowLeave();showSuccess(t('habitUpdated',{name:(emoji+' '+name.trim()).trim()}));router.dismissTo('/(tabs)')});
    }catch(error){Alert.alert(t('couldNotSave'),error instanceof Error&&error.message==='TYPE_CHANGE_STALE'?t('typeChangeStaleHelp'):type!==root.type?t('typeChangeFailedHelp'):moves.length?t('categoryMoveFailedHelp'):error instanceof Error?error.message:String(error))}
  };
  const archiveRoot=async()=>{
    if(!repo||savingRef.current||mutation.pending.current||confirming.current)return;
    try{
      const restoring=!!root.archivedAt;
      if(dirty){
        confirming.current=true;setReviewing(true);
        const confirmed=await new Promise<boolean>(resolve=>Alert.alert(t('archiveDraftTitle'),t('archiveDraftHelp'),[
          {text:t('keepEditing'),style:'cancel',onPress:()=>resolve(false)},
          {text:t(restoring?'restoreWithoutSaving':'archiveWithoutSaving'),style:'destructive',onPress:()=>resolve(true)},
        ],{cancelable:true,onDismiss:()=>resolve(false)}));
        confirming.current=false;setReviewing(false);
        if(!confirmed)return;
      }
      await mutation.run(()=>repo.archive(root.id,!root.archivedAt),()=>{allowLeave();showSuccess(t(restoring?'habitRestored':'habitArchived',{name:`${root.emoji} ${root.name}`.trim()}));router.dismissTo('/(tabs)')});
    }catch(error){confirming.current=false;setReviewing(false);Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
  };
  const removeRoot=async()=>{
    if(!repo||savingRef.current||mutation.pending.current||confirming.current)return;
    confirming.current=true;setReviewing(true);
    try{
      const impact=await repo.deletionImpact(root.id);
      Alert.alert(`${t('delete')} “${root.name}”?`,t('deletionSummary',{habits:impact.habits,entries:impact.entries}),[
        {text:t('cancel'),style:'cancel',onPress:()=>{confirming.current=false;setReviewing(false)}},
        {text:t('delete'),style:'destructive',onPress:async()=>{try{await mutation.run(()=>repo.remove(root.id),()=>{allowLeave();showSuccess(t('habitDeleted',{name:`${root.emoji} ${root.name}`.trim()}));router.dismissTo('/(tabs)')})}catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}finally{confirming.current=false;setReviewing(false)}}},
      ],{cancelable:true,onDismiss:()=>{confirming.current=false;setReviewing(false)}});
    }catch(error){confirming.current=false;setReviewing(false);Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
  };
  return <Screen c={c} title={t('edit')} onSave={save} onSavingChange={value=>{savingRef.current=value}} busy={mutation.busy||reviewing} locked={mutation.needsRefresh}><Text style={[s.label,{color:c.muted}]}>{t('topHabit')}</Text><HabitInputs name={name} emoji={emoji} color={color} onName={setName} onEmoji={setEmoji} onColor={setColor} moveControl={<MoveHabitPicker habits={habits} type={type} excluded={excluded} parentName={name} onSelect={habit=>attach(habit,root.id)} c={c}/>} c={c}/><HabitTypeConversion from={root.type} type={type} onType={changeType} draft={historyDraft} onDraft={setHistoryDraft} c={c} hasHistory={hasHistory}/><CalendarThresholdInput key={type} type={type} value={calendarThreshold} onChange={setCalendarThreshold} c={c} name={name}/><OverviewVisibility value={hideFromOverview} onChange={setHideFromOverview} c={c}/><OverviewVisibility value={isHidden} onChange={setIsHidden} c={c} complete/><View style={s.sectionHeader}><View><Text style={[s.label,{color:c.muted,marginTop:0}]}>{t('children')}</Text><Text style={{color:c.muted,fontSize:12}}>{t('inheritedType')}: {t(type)}</Text></View><TouchableOpacity accessibilityLabel={t('addChild')} onPress={()=>add()} style={[s.plus,{backgroundColor:c.accent}]}><Text style={s.plusText}>＋</Text></TouchableOpacity></View>{nodes.map(node=><DraftRow type={type} key={node.key} node={node} depth={0} c={c} onChange={(key,patch)=>setNodes(current=>changeNode(current,key,patch))} onAdd={add} onRemove={remove} isAttachment={node=>moves.some(move=>move.id===node.id)} canRemove={node=>!node.id||moves.some(move=>move.id===node.id)||!moves.some(move=>descendants(habits,move.id).some(child=>child.id===node.id))} existing={node=><MoveHabitPicker habits={habits} type={type} excluded={excluded} parentName={node.name} parentPath={[name.trim()||t('newCategory'),...draftPath(nodes,node.key)??[]].join(' / ')} onSelect={habit=>attach(habit,node.key)} c={c}/>}/>)}{!nodes.length&&<TouchableOpacity onPress={()=>add()} style={[s.emptyChildren,{borderColor:c.line}]}><Text style={{color:c.accent,fontWeight:'700'}}>＋ {t('addChild')}</Text></TouchableOpacity>}<TouchableOpacity style={[s.danger,{borderColor:c.line}]} onPress={archiveRoot}><Text style={{color:c.text}}>{root.archivedAt?t('restore'):t('archive')}</Text></TouchableOpacity><TouchableOpacity style={[s.danger,{borderColor:c.line}]} onPress={removeRoot}><Text style={{color:c.danger}}>{t('delete')}</Text></TouchableOpacity></Screen>;
}

function DraftRow({node,depth,c,type,onChange,onAdd,onRemove,existing,canRemove,isAttachment} :{type:HabitType;node:DraftNode;depth:number;c:Palette;onChange:(key:string,patch:Partial<Pick<DraftNode,'name'|'emoji'|'color'|'calendarThreshold'>>)=>void;onAdd:(key:string)=>void;onRemove:(node:DraftNode)=>void;existing:(node:DraftNode)=>React.ReactNode;canRemove:(node:DraftNode)=>boolean;isAttachment:(node:DraftNode)=>boolean}){
  return <View style={{marginLeft:Math.min(depth,4)*14}}><HabitColorPicker value={node.color??null} onChange={color=>onChange(node.key,{color})} c={c}>{colorButton=><View><View style={[s.childRow,{borderColor:c.line}]}><TextInput value={node.emoji} onChangeText={emoji=>onChange(node.key,{emoji})} accessibilityLabel={t('habitEmoji')} accessibilityHint={t('emojiHelp')} style={[s.childEmoji,{backgroundColor:c.card,color:c.text}]}/><TextInput value={node.name} onChangeText={name=>onChange(node.key,{name})} accessibilityLabel={t('habitName')} accessibilityHint={t('habitNameLimitHelp',{limit:habitNameLimit})} placeholder={t('habitName')} placeholderTextColor={c.muted} style={[s.childName,{backgroundColor:c.card,color:c.text}]}/>{colorButton}{existing(node)}<TouchableOpacity accessibilityLabel={t('addLevel')} onPress={()=>onAdd(node.key)} style={[s.rowButton,{backgroundColor:c.soft}]}><Text style={{color:c.accent,fontSize:20}}>＋</Text></TouchableOpacity>{canRemove(node)&&<TouchableOpacity accessibilityLabel={isAttachment(node)?t('cancelCategoryMove',{name:node.name}):`${t('delete')} ${node.name}`} onPress={()=>onRemove(node)} style={s.rowButton}><Text style={{color:c.danger,fontSize:18}}>×</Text></TouchableOpacity>}</View><HabitNameCounter name={node.name} c={c}/></View>}</HabitColorPicker><CalendarThresholdInput key={type} type={type} value={node.calendarThreshold} onChange={calendarThreshold=>onChange(node.key,{calendarThreshold})} c={c} name={node.name}/>{node.children.map(child=><DraftRow type={type} key={child.key} node={child} depth={depth+1} c={c} onChange={onChange} onAdd={onAdd} onRemove={onRemove} existing={existing} canRemove={canRemove} isAttachment={isAttachment}/>)}</View>;
}

function HabitInputs({name,emoji,color,onName,onEmoji,onColor,c,moveControl}:{moveControl?:React.ReactNode;name:string;emoji:string;color:HabitColor|null;onName:(value:string)=>void;onEmoji:(value:string)=>void;onColor:(value:HabitColor|null)=>void;c:Palette}){return <HabitColorPicker value={color??null} onChange={onColor} c={c}>{colorButton=><View><View style={s.nameRow}><TextInput value={emoji} onChangeText={onEmoji} accessibilityLabel={t('habitEmoji')} accessibilityHint={t('emojiHelp')} style={[s.emoji,{backgroundColor:c.card,color:c.text}]}/><TextInput value={name} onChangeText={onName} accessibilityLabel={t('habitName')} accessibilityHint={t('habitNameLimitHelp',{limit:habitNameLimit})} placeholder={t('habitName')} placeholderTextColor={c.muted} style={[s.input,{backgroundColor:c.card,color:c.text}]}/>{colorButton}{moveControl}</View><HabitNameCounter name={name} c={c}/></View>}</HabitColorPicker>}
function Screen({c,title,onSave,children,onSavingChange,busy=false,locked=false}:{busy?:boolean;locked?:boolean;c:Palette;title:string;onSave:()=>Promise<void>;children:React.ReactNode;onSavingChange?:(value:boolean)=>void}){const pending=useRef(false),[saving,setSaving]=useState(false);const save=async()=>{if(pending.current)return;pending.current=true;setSaving(true);onSavingChange?.(true);try{await onSave()}finally{pending.current=false;setSaving(false);onSavingChange?.(false)}};return <ScrollView style={[s.page,{backgroundColor:c.bg}]} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><View style={s.top}><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} disabled={saving||busy} hitSlop={8} style={s.cancelButton} onPress={()=>router.dismissTo('/(tabs)')}><Text style={{color:c.accent,fontSize:17}}>‹ {t('cancel')}</Text></TouchableOpacity><Text style={[s.title,{color:c.text}]}>{title}</Text><TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:saving||busy,busy:saving||busy}} disabled={saving||busy} onPress={save}><Text style={{color:c.accent,fontWeight:'700',fontSize:17}}>{t('save')}</Text></TouchableOpacity></View><View pointerEvents={saving||busy||locked?'none':'auto'}>{children}</View></ScrollView>}

const s=StyleSheet.create({page:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},content:{padding:20,paddingTop:12,paddingBottom:50},top:{minHeight:48,flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:30},cancelButton:{minHeight:44,justifyContent:'center'},title:{fontSize:17,fontWeight:'700'},label:{fontSize:13,textTransform:'uppercase',letterSpacing:1,marginTop:22,marginBottom:8},nameRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},emoji:{width:58,padding:14,borderRadius:13,fontSize:20,textAlign:'center'},input:{flex:1,minWidth:96,padding:14,borderRadius:13,fontSize:17},pills:{gap:8},pill:{paddingHorizontal:16,paddingVertical:12,borderRadius:20},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:30,marginBottom:10},plus:{width:44,height:44,borderRadius:16,alignItems:'center',justifyContent:'center'},plusText:{color:'white',fontSize:23,fontWeight:'700'},childRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:7,paddingVertical:6,borderBottomWidth:StyleSheet.hairlineWidth},childEmoji:{width:48,minHeight:46,borderRadius:12,textAlign:'center',fontSize:18},childName:{flex:1,minWidth:96,minHeight:46,borderRadius:12,paddingHorizontal:12,fontSize:15},rowButton:{width:38,height:44,alignItems:'center',justifyContent:'center',borderRadius:12},emptyChildren:{minHeight:60,borderWidth:1,borderStyle:'dashed',borderRadius:14,alignItems:'center',justifyContent:'center'},danger:{padding:16,borderTopWidth:StyleSheet.hairlineWidth,marginTop:18}});
