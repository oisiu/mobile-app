import React from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { HabitTypeConversion } from '../src/features/HabitTypeConversion';
import { HabitVisibility } from '../src/features/habitEditor/HabitVisibility';
import { ChildAddActions,ChildReorderActions } from '../src/features/habitEditor/ChildActions';
import { DraftRow } from '../src/features/habitEditor/DraftRow';
import { EditorScreen } from '../src/features/habitEditor/EditorScreen';
import type { DraftNode } from '../src/features/habitEditor/draftTree';
import { HabitColorPicker } from '../src/features/HabitColorPicker';
import { CalendarThresholdInput } from '../src/features/CalendarThresholdInput';
import { light,dark } from '../src/theme';
import { t } from '../src/i18n';

const mocks=vi.hoisted(()=>({dismissTo:vi.fn()}));
vi.mock('react-native',()=>({View:'View',Text:'Text',TextInput:'Input',TouchableOpacity:'Button',ScrollView:'ScrollView',StyleSheet:{create:(s:unknown)=>s,hairlineWidth:1}}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('expo-router',()=>({router:{dismissTo:mocks.dismissTo}}));
let renderer:ReactTestRenderer;
async function render(element:React.ReactElement){await act(async()=>{renderer=create(element)});return renderer.root}
const button=(label:string)=>renderer.root.find(node=>node.type as unknown==='Button'&&node.props.accessibilityLabel===label);
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks()});
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount())});

it.each([light,dark])('keeps both visibility toggles in one row with independent states and decorative leading icons',async c=>{
 const overview=vi.fn(),hidden=vi.fn();
 const root=await render(<HabitVisibility hideFromOverview={false} onOverviewChange={overview} isHidden onHiddenChange={hidden} c={c}/>);
 expect(root.findAllByType('View' as React.ElementType)[0].props.style.flexDirection).toBe('row');
 const first=button(t('hideFromOverview')),second=button(t('hideCompletely'));
 expect(first.props.accessibilityState.checked).toBe(false);expect(second.props.accessibilityState.checked).toBe(true);
 expect(first.findAllByType('Icon' as React.ElementType)[0].props).toMatchObject({name:'pie-chart-outline',accessible:false});
 expect(second.findAllByType('Icon' as React.ElementType)[0].props).toMatchObject({name:'eye-off-outline',accessible:false});
 expect(second.props.accessibilityHint).toContain('→');
 expect(first.props.style.flex).toBe(1);expect(second.props.style.flex).toBe(1);
 await act(async()=>first.props.onPress());expect(overview).toHaveBeenCalledWith(true);expect(hidden).not.toHaveBeenCalled();
 await act(async()=>second.props.onPress());expect(hidden).toHaveBeenCalledWith(false);
 await act(async()=>renderer.update(<HabitVisibility hideFromOverview onOverviewChange={overview} isHidden={false} onHiddenChange={hidden} c={c}/>));
 expect(button(t('hideFromOverview')).findAllByType('Icon' as React.ElementType).at(-1)?.props.name).toBe('checkbox');
 expect(button(t('hideCompletely')).findAllByType('Icon' as React.ElementType).at(-1)?.props.name).toBe('square-outline');
});

it.each(['boolean','number','duration'] as const)('shows a stable one-row type selector and only the selected %s example',async from=>{
 const choose=vi.fn(),draft={date:'',value:'',unit:'minutes' as const};
 await render(<HabitTypeConversion from={from} type={from} onType={choose} draft={draft} onDraft={vi.fn()} hasHistory={false} c={light}/>);
 const group=renderer.root.find(node=>node.type as unknown==='View'&&node.props.accessibilityLabel===t('changeHabitType'));
 expect(group.props.style.flexDirection).toBe('row');
 expect(group.findAllByType('Button' as React.ElementType).map(node=>node.props.accessibilityLabel)).toEqual(['boolean','number','duration'].map(type=>t(type as 'boolean'|'number'|'duration')));
 for(const type of ['boolean','number','duration'] as const){
  await act(async()=>button(t(type)).props.onPress());expect(choose).toHaveBeenLastCalledWith(type);
  await act(async()=>renderer.update(<HabitTypeConversion from={from} type={type} onType={choose} draft={draft} onDraft={vi.fn()} hasHistory={false} c={light}/>));
  const examples=renderer.root.findAll(node=>node.type as unknown==='Text'&&node.props.accessibilityLiveRegion==='polite');
  expect(examples.map(node=>node.props.children)).toEqual([t(`${type}ShortExample`)]);
  expect(renderer.root.findAllByType('Input' as React.ElementType)).toHaveLength(0);
  expect(button(t(type)).props.accessibilityState.selected).toBe(true);
 }
});

it('keeps decimal input and duration unit conversion intact with concise conversion copy',async()=>{
 const onDraft=vi.fn(),draft={date:'',value:'1.5',unit:'hours' as const};
 await render(<HabitTypeConversion from="number" type="duration" onType={vi.fn()} draft={draft} onDraft={onDraft} hasHistory c={light}/>);
 const input=renderer.root.findByType('Input' as React.ElementType);
 expect(input.props.accessibilityLabel).toBe(t('historyUnitDuration'));
 await act(async()=>input.props.onChangeText('2,5'));expect(onDraft).toHaveBeenLastCalledWith({...draft,value:'2.5'});
 await act(async()=>button(t('minutes')).props.onPress());expect(onDraft).toHaveBeenLastCalledWith({...draft,value:'90',unit:'minutes'});
 await act(async()=>renderer.update(<HabitTypeConversion from="number" type="boolean" onType={vi.fn()} draft={draft} onDraft={onDraft} hasHistory c={light}/>));
 expect(renderer.root.findAllByType('Input' as React.ElementType)).toHaveLength(0);
 expect(renderer.root.findAll(node=>node.type as unknown==='Text'&&node.props.children===t('historyToBooleanHelp'))).toHaveLength(1);
});

it('disables reorder boundaries, hides controls for one child, and names unnamed drafts',async()=>{
 const move=vi.fn();
 await render(<ChildReorderActions name=" " siblingIndex={0} siblingCount={2} onReorder={move} c={light}/>);
 await act(async()=>button(t('moveUp')+' '+t('newCategory')).props.onPress());expect(move).not.toHaveBeenCalled();
 await act(async()=>button(t('moveDown')+' '+t('newCategory')).props.onPress());expect(move).toHaveBeenCalledWith(1);
 await act(async()=>renderer.update(<ChildReorderActions name="Last" siblingIndex={1} siblingCount={2} onReorder={move} c={light}/>));
 await act(async()=>button(t('moveDown')+' Last').props.onPress());expect(move).toHaveBeenCalledTimes(1);
 await act(async()=>button(t('moveUp')+' Last').props.onPress());expect(move).toHaveBeenCalledWith(-1);
 await act(async()=>renderer.update(<ChildReorderActions name="Only" siblingIndex={0} siblingCount={1} onReorder={move} c={light}/>));
 expect(renderer.root.findAllByType('Button' as React.ElementType)).toHaveLength(0);
});

it('groups new and existing child actions and routes the new-child callback at each level',async()=>{
 const add=vi.fn();
 for(const nested of [false,true]){
  const element=<ChildAddActions onAdd={add} existing={<TextMarker/>} c={light} nested={nested}/>;
  if(!nested)await render(element);else await act(async()=>renderer.update(element));
  expect(renderer.root.findByType('Marker' as React.ElementType)).toBeDefined();
  await act(async()=>button(t(nested?'addLevel':'addChild')).props.onPress());
 }
 expect(add).toHaveBeenCalledTimes(2);
});
function TextMarker(){return React.createElement('Marker')}

it('caps cumulative nested indentation and forwards row edits to the correct child',async()=>{
 const node=(key:string,children:DraftNode[]=[]):DraftNode=>({key,name:key,emoji:'✨',color:null,calendarThreshold:null,children});
 let tree=node('deep');for(let i=7;i>=0;i--)tree=node('level'+i,[tree]);
 const change=vi.fn(),add=vi.fn(),remove=vi.fn();
 await render(<DraftRow node={tree} depth={0} siblingIndex={0} siblingCount={1} type="number" c={light} onChange={change} onAdd={add} onRemove={remove} onReorder={vi.fn()} existing={()=>null} canRemove={()=>true} isAttachment={()=>false}/>);
 const rows=renderer.root.findAllByType(DraftRow),margins=rows.map(row=>row.findAllByType('View' as React.ElementType)[0].props.style.marginLeft);
 expect(margins).toEqual([0,14,14,14,14,0,0,0,0]);expect(margins.reduce((sum,value)=>sum+value,0)).toBe(56);
 const deep=rows.at(-1)!;
 await act(async()=>deep.findByType(HabitColorPicker).props.onChange('wine'));expect(change).toHaveBeenLastCalledWith('deep',{color:'wine'});
 await act(async()=>deep.findByType(CalendarThresholdInput).props.onChange(2));expect(change).toHaveBeenLastCalledWith('deep',{calendarThreshold:2});
 const inputs=deep.findAllByType('Input' as React.ElementType);
 await act(async()=>inputs[0].props.onChangeText('🌱'));expect(change).toHaveBeenLastCalledWith('deep',{emoji:'🌱'});
 await act(async()=>inputs[1].props.onChangeText('Renamed'));expect(change).toHaveBeenLastCalledWith('deep',{name:'Renamed'});
 const addButton=deep.find(node=>node.type as unknown==='Button'&&node.props.accessibilityLabel===t('addLevel'));
 await act(async()=>addButton.props.onPress());expect(add).toHaveBeenCalledWith('deep');
 await act(async()=>button(t('delete')+' deep').props.onPress());expect(remove).toHaveBeenCalledWith(expect.objectContaining({key:'deep'}));
});

it.each(['busy','locked'] as const)('blocks child interaction and accessibility while the editor is %s',async state=>{
 const save=vi.fn().mockResolvedValue(undefined);
 await render(<EditorScreen c={light} title="Editor" onSave={save} {...{[state]:true}}><TextMarker/></EditorScreen>);
 const locked=renderer.root.find(node=>node.type as unknown==='View'&&node.props.pointerEvents==='none');
 expect(locked.props.accessibilityElementsHidden).toBe(true);expect(locked.props.importantForAccessibility).toBe('no-hide-descendants');
 const saveButton=renderer.root.find(node=>node.type as unknown==='Button'&&node.findAll(child=>child.type as unknown==='Text'&&child.props.children===t('save')).length>0);
 await act(async()=>saveButton.props.onPress());expect(save).toHaveBeenCalledTimes(state==='busy'?0:1);
});

it('blocks repeated saves until completion and exposes the editor again afterwards',async()=>{
 let finish!:()=>void;const save=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve})),status=vi.fn();
 await render(<EditorScreen c={light} title="Editor" onSave={save} onSavingChange={status}><TextMarker/></EditorScreen>);
 const saveButton=()=>renderer.root.find(node=>node.type as unknown==='Button'&&node.findAll(child=>child.type as unknown==='Text'&&child.props.children===t('save')).length>0);
 let pending!:Promise<void>;
 await act(async()=>{pending=saveButton().props.onPress();void saveButton().props.onPress()});
 expect(save).toHaveBeenCalledOnce();expect(status).toHaveBeenLastCalledWith(true);expect(button(t('cancel')).props.disabled).toBe(true);
 expect(renderer.root.find(node=>node.type as unknown==='View'&&node.props.pointerEvents==='none').props.accessibilityElementsHidden).toBe(true);
 await act(async()=>{finish();await pending});expect(status).toHaveBeenLastCalledWith(false);
 expect(renderer.root.find(node=>node.type as unknown==='View'&&node.props.pointerEvents==='auto').props.accessibilityElementsHidden).toBe(false);
});

it('unlocks the editor after an unexpected save error and keeps Cancel available',async()=>{
 const save=vi.fn().mockRejectedValueOnce(new Error('Synthetic save failure')).mockResolvedValue(undefined),status=vi.fn();
 await render(<EditorScreen c={light} title="Editor" onSave={save} onSavingChange={status}><TextMarker/></EditorScreen>);
 const saveButton=()=>renderer.root.find(node=>node.type as unknown==='Button'&&node.findAll(child=>child.type as unknown==='Text'&&child.props.children===t('save')).length>0);
 await act(async()=>{await expect(saveButton().props.onPress()).rejects.toThrow('Synthetic save failure')});
 expect(status).toHaveBeenLastCalledWith(false);expect(button(t('cancel')).props.disabled).toBe(false);
 await act(async()=>saveButton().props.onPress());expect(save).toHaveBeenCalledTimes(2);
 await act(async()=>button(t('cancel')).props.onPress());expect(mocks.dismissTo).toHaveBeenCalledWith('/(tabs)');
});
