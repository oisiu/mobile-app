import { expect,it } from 'vitest';
import { calendarScrollOffset } from '../src/features/insights/calendarScroll';

it('centers the selected week for narrow and wide dialogs',()=>{
  for(const width of [240,350,700]){
    const x=calendarScrollOffset(12,47,44,width,2000);
    expect(12*47+22-x).toBe(width/2);
  }
});
it('keeps the selected week near the edge when centering would overscroll',()=>{
  expect(calendarScrollOffset(0,47,44,350,1000)).toBe(0);
  expect(calendarScrollOffset(20,47,44,350,984)).toBe(634);
});
it('does not scroll content smaller than the viewport',()=>{
  expect(calendarScrollOffset(2,47,44,350,138)).toBe(0);
});
