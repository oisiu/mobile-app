import { expect,it } from 'vitest';
import { assertCalendarThreshold,calendarFillOpacity,isValidCalendarThreshold } from '../src/domain/calendarThreshold';
it('uses a fixed soft fill strictly below the threshold, including zero',()=>{
 expect(calendarFillOpacity(10,9)).toBe(.3);expect(calendarFillOpacity(10,0)).toBe(.3);
 expect(calendarFillOpacity(10,10)).toBe(1);expect(calendarFillOpacity(10,11)).toBe(1);
 expect(calendarFillOpacity(undefined,2)).toBe(1);expect(calendarFillOpacity(null,2)).toBe(1);
});
it('allows optional positive quantities and integer duration seconds only',()=>{
 expect(isValidCalendarThreshold('boolean',null)).toBe(true);expect(isValidCalendarThreshold('boolean',undefined)).toBe(true);
 expect(isValidCalendarThreshold('number',.5)).toBe(true);expect(isValidCalendarThreshold('duration',60)).toBe(true);
 for(const value of [0,-1,NaN,Infinity,'1'])expect(()=>assertCalendarThreshold('number',value)).toThrow('Invalid calendar threshold');
 expect(()=>assertCalendarThreshold('boolean',1)).toThrow();expect(()=>assertCalendarThreshold('duration',.5)).toThrow();expect(()=>assertCalendarThreshold('duration',Number.MAX_SAFE_INTEGER+1)).toThrow();
 expect(()=>assertCalendarThreshold('duration',120)).not.toThrow();
});
