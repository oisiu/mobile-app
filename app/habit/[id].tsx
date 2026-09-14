import { useDraftGuard } from '@/features/useDraftGuard';
import React,{useState} from 'react';
import { ActivityIndicator,Alert,ScrollView,StyleSheet,Text,TextInput,TouchableOpacity,View } from 'react-native';
import { router,useLocalSearchParams } from 'expo-router';
import { Habit,HabitNode,HabitType } from '@/domain/types';
import { buildTree,topLevelAncestor } from '@/domain/tree';
import { TreeDraftCreate,TreeDraftUpdate } from '@/data/repository';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { dark,light } from '@/theme';

const types:HabitType[]=['boolean','number','duration'];
type Palette=typeof light|typeof dark;
type DraftNode={key:string;id?:string;name:string;emoji:string;children:DraftNode[]};
let draftSequence=0;
const draftKey=()=>`draft-${++draftSequence}`;
const fromNode=(node:HabitNode):DraftNode=>({key:node.id,id:node.id,name:node.name,emoji:node.emoji,children:node.children.map(fromNode)});
const changeNode=(items:DraftNode[],key:string,patch:Partial<Pick<DraftNode,'name'|'emoji'>>):DraftNode[]=>items.map(item=>item.key===key?{...item,...patch}:{...item,children:changeNode(item.children,key,patch)});
const addNode=(items:DraftNode[],parentKey:string,node:DraftNode):DraftNode[]=>items.map(item=>item.key===parentKey?{...item,children:[...item.children,node]}:{...item,children:addNode(item.children,parentKey,node)});
const dropNode=(items:DraftNode[],key:string):DraftNode[]=>items.filter(item=>item.key!==key).map(item=>({...item,children:dropNode(item.children,key)}));
const flatten=(items:DraftNode[],parentKey:string,updates:TreeDraftUpdate[],creates:TreeDraftCreate[])=>{for(const item of items){if(item.id)updates.push({id:item.id,name:item.name,emoji:item.emoji});else creates.push({key:item.key,parentKey,name:item.name,emoji:item.emoji});flatten(item.children,item.key,updates,creates)}};

export default function HabitEditor(){
  const {id}=useLocalSearchParams<{id:string}>(),isNew=id==='new',{ready,habits,repo,refresh,showSuccess,palette:c}=useApp();
  if(!ready)return <View style={[s.center,{backgroundColor:c.bg}]}><ActivityIndicator color={c.accent}/></View>;
  if(isNew)return <NewRoot c={c} repo={repo} refresh={refresh} showSuccess={showSuccess}/>;
  const root=topLevelAncestor(habits,id);
  if(!root)return <View style={[s.center,{backgroundColor:c.bg}]}><Text style={{color:c.text}}>{t('categoryNotFound')}</Text></View>;
  return <TreeEditor key={root.id} root={root} habits={habits} repo={repo} refresh={refresh} showSuccess={showSuccess} c={c}/>;
}

function NewRoot({c,repo,refresh,showSuccess}:{c:Palette;repo:ReturnType<typeof useApp>['repo'];refresh:()=>Promise<void>;showSuccess:(message:string)=>void}){
  const [name,setName]=useState(''),[emoji,setEmoji]=useState('✨'),[type,setType]=useState<HabitType>('boolean');
  const allowLeave=useDraftGuard(name!==''||emoji!=='✨'||type!=='boolean');
  const save=async()=>{try{if(!repo||!name.trim())return;await repo.create({name,emoji,type,parentId:null});await refresh();allowLeave();showSuccess(t('habitCreated',{name:`${emoji} ${name.trim()}`.trim()}));router.back()}catch(e){Alert.alert(t('couldNotSave'),e instanceof Error?e.message:String(e))}};
  return <Screen c={c} title={t('add')} onSave={save}><HabitInputs name={name} emoji={emoji} onName={setName} onEmoji={setEmoji} c={c}/><Text style={[s.label,{color:c.muted}]}>{t('type')}</Text><View style={s.pills}>{types.map(item=><TouchableOpacity key={item} onPress={()=>setType(item)} style={[s.pill,{backgroundColor:type===item?c.accent:c.card}]}><Text style={{color:type===item?'white':c.text}}>{t(item)}</Text><Text style={{color:type===item?'white':c.muted,fontSize:12,marginTop:4,fontWeight:'700'}}>{t(`${item}Example`)}</Text></TouchableOpacity>)}</View></Screen>;
}

function TreeEditor({root,habits,repo,refresh,showSuccess,c}:{root:Habit;habits:Habit[];repo:ReturnType<typeof useApp>['repo'];refresh:()=>Promise<void>;showSuccess:(message:string)=>void;c:Palette}){
  const rootNode=buildTree(habits).find(item=>item.id===root.id),[name,setName]=useState(root.name),[emoji,setEmoji]=useState(root.emoji),[nodes,setNodes]=useState<DraftNode[]>(()=>rootNode?.children.map(fromNode)??[]),[deletedIds,setDeletedIds]=useState<string[]>([]);
  const [initial]=useState(()=>JSON.stringify({name:root.name,emoji:root.emoji,nodes:rootNode?.children.map(fromNode)??[]}));
  const allowLeave=useDraftGuard(JSON.stringify({name,emoji,nodes})!==initial);
  const blank=():DraftNode=>({key:draftKey(),name:'',emoji:'✨',children:[]});
  const add=(parentKey?:string)=>setNodes(current=>parentKey?addNode(current,parentKey,blank()):[...current,blank()]);
  const remove=(node:DraftNode)=>{const commit=()=>{setNodes(current=>dropNode(current,node.key));if(node.id)setDeletedIds(current=>[...current,node.id!])};if(!node.id)return commit();void repo?.deletionImpact(node.id).then(impact=>Alert.alert(`${t('delete')} “${node.name}”?`,`${impact.habits} habit${impact.habits===1?'':'s'} · ${impact.entries} record${impact.entries===1?'':'s'}`,[{text:t('cancel'),style:'cancel'},{text:t('delete'),style:'destructive',onPress:commit}]))};
  const save=async()=>{try{if(!repo||!name.trim())return;const updates:TreeDraftUpdate[]=[{id:root.id,name,emoji}],creates:TreeDraftCreate[]=[];flatten(nodes,root.id,updates,creates);if(creates.some(item=>!item.name.trim())||updates.some(item=>!item.name.trim()))return Alert.alert(t('nameRequired'));await repo.editTree(root.id,updates,creates,deletedIds);await refresh();allowLeave();showSuccess(t('habitUpdated',{name:`${emoji} ${name.trim()}`.trim()}));router.back()}catch(e){Alert.alert(t('couldNotSave'),e instanceof Error?e.message:String(e))}};
  const removeRoot=async()=>{if(!repo)return;const impact=await repo.deletionImpact(root.id);Alert.alert(`${t('delete')} “${root.name}”?`,`${impact.habits} habit${impact.habits===1?'':'s'} · ${impact.entries} record${impact.entries===1?'':'s'}`,[{text:t('cancel'),style:'cancel'},{text:t('delete'),style:'destructive',onPress:async()=>{await repo.remove(root.id);allowLeave();await refresh();showSuccess(t('habitDeleted',{name:`${root.emoji} ${root.name}`.trim()}));router.dismissTo('/(tabs)')}}])};
  return <Screen c={c} title={t('edit')} onSave={save}><Text style={[s.label,{color:c.muted}]}>{t('topHabit')}</Text><HabitInputs name={name} emoji={emoji} onName={setName} onEmoji={setEmoji} c={c}/><View style={s.sectionHeader}><View><Text style={[s.label,{color:c.muted,marginTop:0}]}>{t('children')}</Text><Text style={{color:c.muted,fontSize:12}}>{t('inheritedType')}: {t(root.type)}</Text></View><TouchableOpacity accessibilityLabel={t('addChild')} onPress={()=>add()} style={[s.plus,{backgroundColor:c.accent}]}><Text style={s.plusText}>＋</Text></TouchableOpacity></View>{nodes.map(node=><DraftRow key={node.key} node={node} depth={0} c={c} onChange={(key,patch)=>setNodes(current=>changeNode(current,key,patch))} onAdd={add} onRemove={remove}/>)}{!nodes.length&&<TouchableOpacity onPress={()=>add()} style={[s.emptyChildren,{borderColor:c.line}]}><Text style={{color:c.accent,fontWeight:'700'}}>＋ {t('addChild')}</Text></TouchableOpacity>}<TouchableOpacity style={[s.danger,{borderColor:c.line}]} onPress={async()=>{const restoring=!!root.archivedAt;await repo?.archive(root.id,!root.archivedAt);await refresh();showSuccess(t(restoring?'habitRestored':'habitArchived',{name:`${root.emoji} ${root.name}`.trim()}));router.back()}}><Text style={{color:c.text}}>{root.archivedAt?t('restore'):t('archive')}</Text></TouchableOpacity><TouchableOpacity style={[s.danger,{borderColor:c.line}]} onPress={removeRoot}><Text style={{color:c.danger}}>{t('delete')}</Text></TouchableOpacity></Screen>;
}

function DraftRow({node,depth,c,onChange,onAdd,onRemove}:{node:DraftNode;depth:number;c:Palette;onChange:(key:string,patch:Partial<Pick<DraftNode,'name'|'emoji'>>)=>void;onAdd:(key:string)=>void;onRemove:(node:DraftNode)=>void}){
  return <View style={{marginLeft:Math.min(depth,4)*14}}><View style={[s.childRow,{borderColor:c.line}]}><TextInput value={node.emoji} onChangeText={emoji=>onChange(node.key,{emoji})} maxLength={4} style={[s.childEmoji,{backgroundColor:c.card,color:c.text}]}/><TextInput value={node.name} onChangeText={name=>onChange(node.key,{name})} placeholder={t('habitName')} placeholderTextColor={c.muted} style={[s.childName,{backgroundColor:c.card,color:c.text}]}/><TouchableOpacity accessibilityLabel={t('addLevel')} onPress={()=>onAdd(node.key)} style={[s.rowButton,{backgroundColor:c.soft}]}><Text style={{color:c.accent,fontSize:20}}>＋</Text></TouchableOpacity><TouchableOpacity accessibilityLabel={`${t('delete')} ${node.name}`} onPress={()=>onRemove(node)} style={s.rowButton}><Text style={{color:c.danger,fontSize:18}}>×</Text></TouchableOpacity></View>{node.children.map(child=><DraftRow key={child.key} node={child} depth={depth+1} c={c} onChange={onChange} onAdd={onAdd} onRemove={onRemove}/>)}</View>;
}

function HabitInputs({name,emoji,onName,onEmoji,c}:{name:string;emoji:string;onName:(value:string)=>void;onEmoji:(value:string)=>void;c:Palette}){return <View style={s.nameRow}><TextInput value={emoji} onChangeText={onEmoji} maxLength={4} style={[s.emoji,{backgroundColor:c.card,color:c.text}]}/><TextInput value={name} onChangeText={onName} placeholder={t('habitName')} placeholderTextColor={c.muted} style={[s.input,{backgroundColor:c.card,color:c.text}]}/></View>}
function Screen({c,title,onSave,children}:{c:Palette;title:string;onSave:()=>void;children:React.ReactNode}){return <ScrollView style={[s.page,{backgroundColor:c.bg}]} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><View style={s.top}><TouchableOpacity onPress={()=>router.back()}><Text style={{color:c.accent,fontSize:17}}>‹ {t('cancel')}</Text></TouchableOpacity><Text style={[s.title,{color:c.text}]}>{title}</Text><TouchableOpacity onPress={onSave}><Text style={{color:c.accent,fontWeight:'700',fontSize:17}}>{t('save')}</Text></TouchableOpacity></View>{children}</ScrollView>}

const s=StyleSheet.create({page:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},content:{padding:20,paddingTop:12,paddingBottom:50},top:{minHeight:48,flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:30},title:{fontSize:17,fontWeight:'700'},label:{fontSize:13,textTransform:'uppercase',letterSpacing:1,marginTop:22,marginBottom:8},nameRow:{flexDirection:'row',gap:10},emoji:{width:58,padding:14,borderRadius:13,fontSize:20,textAlign:'center'},input:{flex:1,padding:14,borderRadius:13,fontSize:17},pills:{gap:8},pill:{paddingHorizontal:16,paddingVertical:12,borderRadius:20},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:30,marginBottom:10},plus:{width:44,height:44,borderRadius:16,alignItems:'center',justifyContent:'center'},plusText:{color:'white',fontSize:23,fontWeight:'700'},childRow:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:6,borderBottomWidth:StyleSheet.hairlineWidth},childEmoji:{width:48,minHeight:46,borderRadius:12,textAlign:'center',fontSize:18},childName:{flex:1,minHeight:46,borderRadius:12,paddingHorizontal:12,fontSize:15},rowButton:{width:38,height:44,alignItems:'center',justifyContent:'center',borderRadius:12},emptyChildren:{minHeight:60,borderWidth:1,borderStyle:'dashed',borderRadius:14,alignItems:'center',justifyContent:'center'},danger:{padding:16,borderTopWidth:StyleSheet.hairlineWidth,marginTop:18}});
