import React from 'react';
import { act,create,ReactTestInstance,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import More from '../app/(tabs)/settings';
import { light } from '../src/theme';
import { language,t } from '../src/i18n';
import { AI_IMPORT_PROMPT } from '../src/features/import/aiImportPrompt';
import { MAX_IMPORT_FILE_BYTES } from '../src/domain/import';

const mock=vi.hoisted(()=>({app:{} as Record<string,unknown>,alert:vi.fn(),dismiss:vi.fn(),copy:vi.fn(),pick:vi.fn(),read:vi.fn(),write:vi.fn(),remove:vi.fn(),share:vi.fn(),link:vi.fn(),platform:{OS:'ios'},bottom:34}));
vi.mock('react-native',()=>({useWindowDimensions:()=>({width:390,height:844,scale:1,fontScale:1}),View:'View',Text:'Text',Pressable:'Pressable',TouchableOpacity:'TouchableOpacity',ScrollView:'ScrollView',Modal:'Modal',KeyboardAvoidingView:'KeyboardAvoidingView',ActivityIndicator:'Spinner',Alert:{alert:mock.alert},Keyboard:{addListener:()=>({remove:vi.fn()}),dismiss:mock.dismiss},Platform:mock.platform,StyleSheet:{create:(value:unknown)=>value,hairlineWidth:1}}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:mock.bottom,left:0,right:0})}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>mock.app}));
vi.mock('expo-file-system/legacy',()=>({cacheDirectory:'file:///cache/',readAsStringAsync:mock.read,writeAsStringAsync:mock.write,deleteAsync:mock.remove}));
vi.mock('expo-sharing',()=>({shareAsync:mock.share}));
vi.mock('expo-document-picker',()=>({getDocumentAsync:mock.pick}));
vi.mock('expo-clipboard',()=>({setStringAsync:mock.copy}));
vi.mock('expo-router',()=>({router:{push:vi.fn()},useFocusEffect:()=>undefined}));
vi.mock('expo-linking',()=>({openURL:mock.link}));

const localizedLink=(url:string)=>language==='es'?url.replace('https://oisiu.github.io/legal/','https://oisiu.github.io/legal/es/'):url;
const data={version:1,exportedAt:'2026-01-01T00:00:00Z',habits:[{id:'root',parentId:null,name:'Read "books"',type:'number'},{id:'child',parentId:'root',name:'Pages',type:'number'}],entries:[{id:'entry',habitId:'child',localDate:'2026-01-01',timezone:'UTC',value:0}]};
let renderer:ReactTestRenderer;
let repo:{export:ReturnType<typeof vi.fn>;import:ReturnType<typeof vi.fn>;deleteAllData:ReturnType<typeof vi.fn>};
const render=async()=>{await act(async()=>{renderer=create(<More/>)});return renderer.root};
const action=(root:ReactTestInstance,key:Parameters<typeof t>[0])=>root.findAll(node=>node.type as unknown==='TouchableOpacity').find(node=>node.findAll(child=>child.type as unknown==='Text'&&child.props.children===t(key)).length)!;
const press=async(node:ReactTestInstance)=>{await act(async()=>{await node.props.onPress()})};
const flush=async()=>{await act(async()=>{await Promise.resolve()})};
const modal=(root:ReactTestInstance)=>root.find(node=>node.type as unknown==='Modal');
beforeEach(()=>{
  vi.resetAllMocks();Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});mock.platform.OS='ios';mock.bottom=34;
  repo={export:vi.fn().mockResolvedValue(data),import:vi.fn().mockResolvedValue(undefined),deleteAllData:vi.fn().mockResolvedValue(undefined)};
  mock.app={repo,refresh:vi.fn(),habits:[],entries:[],palette:light,themeMode:'system',setThemeMode:vi.fn()};
  mock.pick.mockResolvedValue({canceled:false,assets:[{uri:'file:///selected.json',size:100}]});mock.read.mockResolvedValue(JSON.stringify(data));
});
afterEach(async()=>{if(renderer)await act(async()=>renderer.unmount())});

it.each(['ios','android'])('keeps copy controls keyboard safe on %s',async platform=>{
  mock.platform.OS=platform;const root=await render();await press(action(root,'convertExport'));expect(modal(root).props.visible).toBe(true);
  await act(async()=>modal(root).props.onShow());expect(mock.dismiss).toHaveBeenCalledOnce();
  const sheet=modal(root).findAll(node=>node.type as unknown==='Pressable')[1];expect(sheet.props.style[0].maxHeight+sheet.props.style[1].top).toBeLessThanOrEqual(844-mock.bottom-12);
  await press(sheet);expect(modal(root).props.visible).toBe(true);
  await press(action(root,'copyPrompt'));await flush();expect(mock.copy).toHaveBeenCalledWith(AI_IMPORT_PROMPT);expect(mock.dismiss).toHaveBeenCalledTimes(2);
  expect(mock.alert).toHaveBeenLastCalledWith(t('promptCopied'),t('promptCopiedHelp'));
});
it('uses a minimum safe bottom gap and reports clipboard failures without raw errors',async()=>{
  mock.bottom=0;mock.copy.mockRejectedValue(new Error('Private clipboard error'));const root=await render();
  const panel=modal(root).findAll(node=>node.type as unknown==='Pressable')[1];expect(panel.props.style[0].maxHeight+panel.props.style[1].top).toBeLessThanOrEqual(844-12);
  await press(action(root,'copyPrompt'));await flush();expect(mock.alert).toHaveBeenLastCalledWith(t('copyFailed'),t('copyFailedHelp'));
});
it.each(['close','back','backdrop'])('dismisses the conversion guide with %s',async method=>{
  const root=await render();await press(action(root,'convertExport'));
  if(method==='close')await press(action(root,'close'));
  else if(method==='back')await act(async()=>modal(root).props.onRequestClose());
  else await press(modal(root).findAll(node=>node.type as unknown==='Pressable')[0]);
  expect(modal(root).props.visible).toBe(false);
});
it.each(['json','csv'] as const)('exports %s only after explicit user action',async kind=>{
  const root=await render();expect(repo.export).not.toHaveBeenCalled();expect(mock.share).not.toHaveBeenCalled();
  await press(action(root,kind==='json'?'exportJson':'exportCsv'));await press(action(root,'exportSelected'));
  const [uri,content]=mock.write.mock.calls[0];expect(uri).toBe(`file:///cache/oisiu-export.${kind}`);
  if(kind==='json')expect(JSON.parse(content)).toEqual(data);
  else expect(content).toContain('entry,2026-01-01,UTC,number,0,"Read ""books"" / Pages"');
  expect(mock.share).toHaveBeenCalledWith(uri,{mimeType:kind==='json'?'application/json':'text/csv'});
});
it.each(['export','write','share'])('shows localized guidance when %s fails',async stage=>{
  (stage==='export'?repo.export:stage==='write'?mock.write:mock.share).mockRejectedValue(new Error('Private transfer error'));
  const root=await render();await press(action(root,'exportJson'));await press(action(root,'exportSelected'));expect(mock.alert).toHaveBeenLastCalledWith(t('exportFailed'),t('exportFailedHelp'));
});
it('does not export or delete before the repository is ready',async()=>{
  mock.app.repo=null;const root=await render();await press(action(root,'exportJson'));await press(action(root,'advancedSettings'));await press(action(root,'deleteAllData'));
  expect(repo.export).not.toHaveBeenCalled();expect(mock.alert).not.toHaveBeenCalled();expect(action(root,'deleteAllData').props.disabled).toBe(true);
});
it('leaves data unchanged when the document picker is canceled',async()=>{
  mock.pick.mockResolvedValue({canceled:true});const root=await render();await press(action(root,'importJson'));
  expect(mock.read).not.toHaveBeenCalled();expect(repo.import).not.toHaveBeenCalled();expect(mock.alert).not.toHaveBeenCalled();
});
it.each(['picker','size','contents','json'])('rejects unreadable or oversized imports: %s',async stage=>{
  if(stage==='picker')mock.pick.mockRejectedValue(new Error('Private file error'));
  if(stage==='size')mock.pick.mockResolvedValue({canceled:false,assets:[{uri:'file:///large.json',size:MAX_IMPORT_FILE_BYTES+1}]});
  if(stage==='contents')mock.read.mockResolvedValue(' '.repeat(MAX_IMPORT_FILE_BYTES+1));
  if(stage==='json')mock.read.mockResolvedValue('{broken');
  const root=await render();await press(action(root,'importJson'));expect(repo.import).not.toHaveBeenCalled();expect(mock.alert).toHaveBeenLastCalledWith(t('fileReadFailed'),t('fileReadHelp'));
  if(stage==='size')expect(mock.read).not.toHaveBeenCalled();
});
it('imports only after confirmation and refreshes the visible data',async()=>{
  const root=await render();await press(action(root,'importJson'));expect(repo.import).not.toHaveBeenCalled();
  await act(async()=>{await mock.alert.mock.calls.at(-1)![2][1].onPress()});expect(repo.import).toHaveBeenCalledWith(data);expect(mock.app.refresh).toHaveBeenCalledOnce();expect(mock.alert).toHaveBeenLastCalledWith(t('importComplete'));
});
it('handles empty import summaries and rejected merges',async()=>{
  mock.read.mockResolvedValue('{}');repo.import.mockRejectedValue(new Error('Private validation detail'));const root=await render();await press(action(root,'importJson'));
  expect(mock.alert.mock.calls[0][1]).toBe(t('importSummary',{habits:0,entries:0}));
  await act(async()=>{await mock.alert.mock.calls.at(-1)![2][1].onPress()});expect(mock.app.refresh).not.toHaveBeenCalled();expect(mock.alert).toHaveBeenLastCalledWith(t('importRejected'),t('importFailedHelp'));
});
it('counts visible and archived habits without hidden General items in the final warning',async()=>{
  mock.app.habits=[{isGeneral:false},{isGeneral:false,archivedAt:'2026-01-01'},{isGeneral:true}];mock.app.entries=[{},{}];const root=await render();await press(action(root,'advancedSettings'));await press(action(root,'deleteAllData'));
  for(let step=0;step<2;step++)await act(async()=>mock.alert.mock.calls.at(-1)![2][1].onPress());
  expect(mock.alert.mock.calls.at(-1)![1]).toBe(t('deleteDataFinalHelp',{habits:2,entries:2}));expect(repo.deleteAllData).not.toHaveBeenCalled();
});
it('blocks repeated deletion while the database write is pending',async()=>{
  let complete!:()=>void;repo.deleteAllData.mockReturnValue(new Promise<void>(resolve=>{complete=resolve}));const root=await render();await press(action(root,'advancedSettings'));await press(action(root,'deleteAllData'));
  for(let step=0;step<3;step++)await act(async()=>mock.alert.mock.calls.at(-1)![2][1].onPress());
  await press(action(root,'deleteAllData'));expect(repo.deleteAllData).toHaveBeenCalledOnce();expect(mock.app.refresh).not.toHaveBeenCalled();expect(action(root,'deleteAllData').props.accessibilityState.busy).toBe(true);
  await act(async()=>complete());expect(mock.app.refresh).toHaveBeenCalledOnce();expect(action(root,'deleteAllData').props.disabled).toBe(false);
});
it('opens only the public privacy page after a tap',async()=>{
  const root=await render();expect(mock.link).not.toHaveBeenCalled();await press(action(root,'privacyPolicy'));expect(mock.link).toHaveBeenCalledWith(localizedLink('https://oisiu.github.io/legal/privacy.html'));
});
it('hides deletion until advanced settings is expanded and supports collapsing it',async()=>{
  const root=await render();expect(action(root,'deleteAllData')).toBeUndefined();expect(action(root,'advancedSettings').props.accessibilityState.expanded).toBe(false);
  await press(action(root,'advancedSettings'));expect(action(root,'deleteAllData')).toBeDefined();expect(action(root,'advancedSettings').props.accessibilityState.expanded).toBe(true);
  await press(action(root,'advancedSettings'));expect(action(root,'deleteAllData')).toBeUndefined();expect(mock.alert).not.toHaveBeenCalled();
});
it.each([
  ['termsConditions','https://oisiu.github.io/legal/terms.html'],
  ['support','https://oisiu.github.io/legal/support.html'],
  ['githubRepo','https://github.com/oisiu/mobile-app'],
] as const)('opens %s only after a tap with accessible link semantics',async(key,url)=>{
  const root=await render();expect(mock.link).not.toHaveBeenCalled();const link=action(root,key);expect(link.props.accessibilityRole).toBe('link');expect(link.props.accessibilityHint).toBe(t('opensBrowser'));
  await press(link);expect(mock.link).toHaveBeenCalledWith(localizedLink(url));
});
it('shows localized guidance when the browser cannot open a link',async()=>{
  mock.link.mockRejectedValue(new Error('Private browser error'));const root=await render();await press(action(root,'support'));await flush();expect(mock.alert).toHaveBeenLastCalledWith(t('linkFailed'),t('linkFailedHelp'));
});

it.each(['json','csv'] as const)('exports only the chosen category as %s and can return to all habits',async kind=>{
  const other={id:'other',parentId:null,name:'Other',type:'number',sortOrder:0,emoji:'',archivedAt:'2025-01-01'},rootHabit={...data.habits[0],sortOrder:1,emoji:'',isHidden:true};
  mock.app.habits=[rootHabit,other,data.habits[1]];
  repo.export.mockResolvedValue({...data,habits:[...data.habits,other],entries:[...data.entries,{...data.entries[0],id:'otherEntry',habitId:'other'}]});
  const root=await render();await press(action(root,kind==='json'?'exportJson':'exportCsv'));
  const radios=()=>root.findAll(node=>node.type as unknown==='TouchableOpacity'&&node.props.accessibilityRole==='checkbox');
  expect(radios().map(node=>node.props.accessibilityLabel)).toEqual([t('exportAllHabits'),` Other (${t('exportArchived')})`,' Read "books"']);
  await press(radios()[2]);await press(action(root,'exportSelected'));
  const content=mock.write.mock.calls[0][1];
  if(kind==='json'){const selected=JSON.parse(content);expect(selected.habits.map((h:{id:string})=>h.id)).toEqual(['root','child']);expect(selected.entries).toEqual(data.entries)}
  else {expect(content).toContain('Pages');expect(content).not.toContain('otherEntry')}
  await press(action(root,'exportJson'));await press(radios()[0]);await press(action(root,'exportSelected'));
  expect(JSON.parse(mock.write.mock.calls[1][1]).habits).toHaveLength(3);
});
it.each(['back','escape','outside'] as const)('blocks repeated exports and %s dismissal until sharing finishes',async method=>{
  let complete!:()=>void;mock.share.mockReturnValue(new Promise<void>(resolve=>{complete=resolve}));
  const root=await render();await act(async()=>{action(root,'exportJson').props.onPress()});await act(async()=>{void action(root,'exportSelected').props.onPress()});await press(action(root,'exportCsv'));
  expect(repo.export).toHaveBeenCalledOnce();expect(root.find(node=>node.type as unknown==='TouchableOpacity'&&node.props.accessibilityLabel===t('exportSelected')).props.disabled).toBe(true);
  expect(action(root,'exportJson').props.disabled).toBe(true);
  const activeModal=root.findAll(node=>node.type as unknown==='Modal').find(node=>node.props.visible)!;
  await act(async()=>{if(method==='back')activeModal.props.onRequestClose();else if(method==='escape')activeModal.find(node=>node.props.accessibilityViewIsModal).props.onAccessibilityEscape();else activeModal.findAll(node=>node.type as unknown==='Pressable')[0].props.onPress()});
  expect(root.find(node=>node.type as unknown==='TouchableOpacity'&&node.props.accessibilityLabel===t('exportSelected')).props.disabled).toBe(true);expect(activeModal.props.visible).toBe(true);expect(repo.export).toHaveBeenCalledOnce();
  await act(async()=>complete());expect(action(root,'exportSelected')).toBeUndefined();
});
it('reports a stale category selection without exporting other habits',async()=>{
  mock.app.habits=[{...data.habits[0],sortOrder:0,emoji:''}];
  const root=await render();await press(action(root,'exportJson'));
  await press(root.find(node=>node.type as unknown==='TouchableOpacity'&&node.props.accessibilityRole==='checkbox'&&node.props.accessibilityLabel===' Read "books"'));
  repo.export.mockResolvedValue({...data,habits:[],entries:[]});await press(action(root,'exportSelected'));
  expect(mock.write).not.toHaveBeenCalled();expect(mock.alert).toHaveBeenLastCalledWith(t('exportFailed'),t('exportFailedHelp'));
});

it('allows multiple categories, blocks an empty selection and cancels without exporting',async()=>{
 mock.app.habits=[{...data.habits[0],emoji:''},{id:'other',parentId:null,name:'Other',emoji:'',sortOrder:1}];
 repo.export.mockResolvedValue({...data,habits:[...data.habits,{id:'other',parentId:null,name:'Other'}]});
 const root=await render();expect(action(root,'exportScope')).toBeUndefined();await press(action(root,'exportJson'));
 const choices=()=>root.findAll(node=>node.type as unknown==='TouchableOpacity'&&node.props.accessibilityRole==='checkbox');
 await press(choices()[1]);await press(choices()[1]);expect(action(root,'exportSelected').props.disabled).toBe(true);
 await press(choices()[1]);await press(choices()[2]);await press(action(root,'exportSelected'));
 expect(JSON.parse(mock.write.mock.calls[0][1]).habits).toHaveLength(3);
 await press(action(root,'exportCsv'));await press(action(root,'cancel'));expect(repo.export).toHaveBeenCalledOnce();
});

it('guards imports from picker through confirmation and pending write, then permits retry',async()=>{
 let complete!:()=>void;repo.import.mockReturnValue(new Promise<void>(resolve=>{complete=resolve}));
 const root=await render();await press(action(root,'importJson'));await press(action(root,'importJson'));
 expect(mock.pick).toHaveBeenCalledOnce();expect(action(root,'importJson').props.disabled).toBe(true);
 await press(action(root,'exportJson'));expect(action(root,'exportSelected')).toBeUndefined();
 const confirm=mock.alert.mock.calls.at(-1)![2][1].onPress;
 await act(async()=>{void confirm();void confirm()});expect(repo.import).toHaveBeenCalledOnce();
 await act(async()=>complete());expect(action(root,'importJson').props.disabled).toBe(false);
 await press(action(root,'importJson'));expect(mock.pick).toHaveBeenCalledTimes(2);
 await act(async()=>mock.alert.mock.calls.at(-1)![2][0].onPress());expect(action(root,'importJson').props.disabled).toBe(false);
});
it('blocks import while the repository is unavailable',async()=>{
 mock.app.repo=null;const root=await render();await press(action(root,'importJson'));expect(mock.pick).not.toHaveBeenCalled();expect(action(root,'importJson').props.disabled).toBe(true);
});

it.each(['json','csv'] as const)('retains the %s export during sharing and removes it afterward',async kind=>{
  let complete!:()=>void;mock.share.mockReturnValue(new Promise<void>(resolve=>{complete=resolve}));
  const root=await render();await press(action(root,kind==='json'?'exportJson':'exportCsv'));
  await act(async()=>{void action(root,'exportSelected').props.onPress()});
  expect(mock.remove).toHaveBeenCalledTimes(3);
  await act(async()=>complete());
  expect(mock.remove).toHaveBeenCalledTimes(6);
  expect(mock.remove).toHaveBeenCalledWith(`file:///cache/oisiu-export.${kind}`,{idempotent:true});
});
it.each(['write','share'])('removes a potentially partial export when %s fails',async stage=>{
  (stage==='write'?mock.write:mock.share).mockRejectedValue(new Error('Private failure'));
  const root=await render();await press(action(root,'exportJson'));await press(action(root,'exportSelected'));
  expect(mock.remove).toHaveBeenCalledTimes(6);
});
it.each(['success','cancel','size','read','json','picker'])('cleans picker cache before any confirmation after %s',async stage=>{
  if(stage==='cancel')mock.pick.mockResolvedValue({canceled:true});
  if(stage==='size')mock.pick.mockResolvedValue({canceled:false,assets:[{uri:'file:///cache/DocumentPicker/large.json',size:MAX_IMPORT_FILE_BYTES+1}]});
  if(stage==='read')mock.read.mockRejectedValue(new Error('Private read failure'));
  if(stage==='json')mock.read.mockResolvedValue('{broken');
  if(stage==='picker')mock.pick.mockRejectedValue(new Error('Private picker failure'));
  const root=await render();await press(action(root,'importJson'));
  expect(mock.remove).toHaveBeenCalledTimes(6);
  expect(mock.remove).toHaveBeenLastCalledWith('file:///cache/DocumentPicker',{idempotent:true});
  expect(mock.remove.mock.invocationCallOrder.at(-1)).toBeGreaterThan(mock.pick.mock.invocationCallOrder[0]);
  if(stage==='success')expect(mock.alert.mock.invocationCallOrder[0]).toBeGreaterThan(mock.remove.mock.invocationCallOrder.at(-1)!);
  expect(mock.remove.mock.calls.every(([uri])=>uri.startsWith('file:///cache/'))).toBe(true);
});
it('clears old transfer files before deleting habits and reports cleanup failure',async()=>{
  mock.remove.mockRejectedValue(new Error('Private filesystem failure'));
  const root=await render();await press(action(root,'advancedSettings'));await press(action(root,'deleteAllData'));
  for(let step=0;step<3;step++)await act(async()=>mock.alert.mock.calls.at(-1)![2][1].onPress());
  await flush();expect(repo.deleteAllData).not.toHaveBeenCalled();
  expect(mock.alert).toHaveBeenLastCalledWith(t('deleteDataFailed'),t('deleteDataFailedHelp'));
  mock.remove.mockResolvedValue(undefined);await press(action(root,'deleteAllData'));
  for(let step=0;step<3;step++)await act(async()=>mock.alert.mock.calls.at(-1)![2][1].onPress());
  await flush();expect(repo.deleteAllData).toHaveBeenCalledOnce();
  expect(mock.remove.mock.invocationCallOrder.at(-1)).toBeLessThan(repo.deleteAllData.mock.invocationCallOrder[0]);
});
it.each(['import','export'])('reports cleanup failure without claiming %s success',async operation=>{
  mock.remove.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockRejectedValue(new Error('Private cleanup error'));
  const root=await render();
  if(operation==='import'){
    await press(action(root,'importJson'));expect(repo.import).not.toHaveBeenCalled();
    expect(mock.alert).toHaveBeenLastCalledWith(t('fileReadFailed'),t('fileReadHelp'));
  }else{
    await press(action(root,'exportJson'));await press(action(root,'exportSelected'));
    expect(mock.alert).toHaveBeenLastCalledWith(t('exportFailed'),t('exportFailedHelp'));
  }
});
