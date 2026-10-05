import React from 'react';
import { act,create,ReactTestInstance,ReactTestRenderer } from 'react-test-renderer';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import More from '../app/(tabs)/settings';
import { light } from '../src/theme';
import { t } from '../src/i18n';
import { AI_IMPORT_PROMPT } from '../src/features/import/aiImportPrompt';
import { MAX_IMPORT_FILE_BYTES } from '../src/domain/import';

const mock=vi.hoisted(()=>({app:{} as Record<string,unknown>,alert:vi.fn(),dismiss:vi.fn(),copy:vi.fn(),pick:vi.fn(),read:vi.fn(),write:vi.fn(),share:vi.fn(),link:vi.fn(),platform:{OS:'ios'},bottom:34}));
vi.mock('react-native',()=>({View:'View',Text:'Text',Pressable:'Pressable',TouchableOpacity:'TouchableOpacity',ScrollView:'ScrollView',Modal:'Modal',KeyboardAvoidingView:'KeyboardAvoidingView',ActivityIndicator:'Spinner',Alert:{alert:mock.alert},Keyboard:{dismiss:mock.dismiss},Platform:mock.platform,StyleSheet:{create:(value:unknown)=>value,hairlineWidth:1}}));
vi.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:mock.bottom,left:0,right:0})}));
vi.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
vi.mock('../src/features/AppProvider',()=>({useApp:()=>mock.app}));
vi.mock('expo-file-system/legacy',()=>({cacheDirectory:'file:///cache/',readAsStringAsync:mock.read,writeAsStringAsync:mock.write}));
vi.mock('expo-sharing',()=>({shareAsync:mock.share}));
vi.mock('expo-document-picker',()=>({getDocumentAsync:mock.pick}));
vi.mock('expo-clipboard',()=>({setStringAsync:mock.copy}));
vi.mock('expo-linking',()=>({openURL:mock.link}));

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
  expect(root.find(node=>node.type as unknown==='KeyboardAvoidingView').props.behavior).toBe(platform==='ios'?'padding':'height');
  const sheet=modal(root).findAll(node=>node.type as unknown==='Pressable')[1];expect(sheet.props.style[1].paddingBottom).toBe(50);
  await press(sheet);expect(modal(root).props.visible).toBe(true);
  await press(action(root,'copyPrompt'));await flush();expect(mock.copy).toHaveBeenCalledWith(AI_IMPORT_PROMPT);expect(mock.dismiss).toHaveBeenCalledTimes(2);
  expect(mock.alert).toHaveBeenLastCalledWith(t('promptCopied'),t('promptCopiedHelp'));
});
it('uses a minimum safe bottom gap and reports clipboard failures without raw errors',async()=>{
  mock.bottom=0;mock.copy.mockRejectedValue(new Error('Private clipboard error'));const root=await render();
  expect(modal(root).findAll(node=>node.type as unknown==='Pressable')[1].props.style[1].paddingBottom).toBe(32);
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
  await press(action(root,kind==='json'?'exportJson':'exportCsv'));
  const [uri,content]=mock.write.mock.calls[0];expect(uri).toBe(`file:///cache/oisiu-export.${kind}`);
  if(kind==='json')expect(JSON.parse(content)).toEqual(data);
  else expect(content).toContain('entry,2026-01-01,UTC,number,0,"Read ""books"" / Pages"');
  expect(mock.share).toHaveBeenCalledWith(uri,{mimeType:kind==='json'?'application/json':'text/csv'});
});
it.each(['export','write','share'])('shows localized guidance when %s fails',async stage=>{
  (stage==='export'?repo.export:stage==='write'?mock.write:mock.share).mockRejectedValue(new Error('Private transfer error'));
  const root=await render();await press(action(root,'exportJson'));expect(mock.alert).toHaveBeenLastCalledWith(t('exportFailed'),t('exportFailedHelp'));
});
it('does not export or delete before the repository is ready',async()=>{
  mock.app.repo=null;const root=await render();await press(action(root,'exportJson'));await press(action(root,'deleteAllData'));
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
  mock.app.habits=[{isGeneral:false},{isGeneral:false,archivedAt:'2026-01-01'},{isGeneral:true}];mock.app.entries=[{},{}];const root=await render();await press(action(root,'deleteAllData'));
  for(let step=0;step<2;step++)await act(async()=>mock.alert.mock.calls.at(-1)![2][1].onPress());
  expect(mock.alert.mock.calls.at(-1)![1]).toBe(t('deleteDataFinalHelp',{habits:2,entries:2}));expect(repo.deleteAllData).not.toHaveBeenCalled();
});
it('blocks repeated deletion while the database write is pending',async()=>{
  let complete!:()=>void;repo.deleteAllData.mockReturnValue(new Promise<void>(resolve=>{complete=resolve}));const root=await render();await press(action(root,'deleteAllData'));
  for(let step=0;step<3;step++)await act(async()=>mock.alert.mock.calls.at(-1)![2][1].onPress());
  await press(action(root,'deleteAllData'));expect(repo.deleteAllData).toHaveBeenCalledOnce();expect(mock.app.refresh).not.toHaveBeenCalled();expect(action(root,'deleteAllData').props.accessibilityState.busy).toBe(true);
  await act(async()=>complete());expect(mock.app.refresh).toHaveBeenCalledOnce();expect(action(root,'deleteAllData').props.disabled).toBe(false);
});
it('opens only the public privacy page after a tap',async()=>{
  const root=await render();expect(mock.link).not.toHaveBeenCalled();await press(action(root,'privacyPolicy'));expect(mock.link).toHaveBeenCalledWith('https://oisiu.github.io/legal/privacy.html');
});
