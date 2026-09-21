import { expect,it,vi } from 'vitest';
import InsightDetailRoute from '../app/insight/[id]';

const route=vi.hoisted(()=>({id:'first-habit'}));
vi.mock('expo-router',()=>({useLocalSearchParams:()=>route}));
vi.mock('../src/features/insights/InsightDetailScreen',()=>({default:()=>null}));

it('resets detail state when a prefetched or reused route changes habits',()=>{
  const first=InsightDetailRoute();
  route.id='second-habit';
  const second=InsightDetailRoute();
  expect(first.type).toBe(second.type);
  expect(first.key).toBe('first-habit');
  expect(second.key).toBe('second-habit');
  expect(InsightDetailRoute().key).toBe(second.key);
});
