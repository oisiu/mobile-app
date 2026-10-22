import { expect,it } from 'vitest';
import { addDays,addMonths,monthCalendarDays } from '../src/utils/dates';
import { buildInsightWindow,buildTimeBuckets,shiftInsightAnchor } from '../src/domain/analytics';
import { buildDetailWindow } from '../src/domain/detailWindow';
import { buildHistoryWindow,historyWeekLabel } from '../src/domain/history';
import { buildTimelineBuckets } from '../src/domain/chartTimeline';
import { Entry } from '../src/domain/types';
import { todayLocal,validateEntry } from '../src/domain/entries';

it('preserves four-digit historical years when adding days and months',()=>{
 expect(todayLocal(new Date('0099-12-31T12:00:00'))).toBe('0099-12-31');
 expect(addDays('0099-12-31',1)).toBe('0100-01-01');
 expect(addDays('0100-01-01',-1)).toBe('0099-12-31');
 expect(addMonths('0099-12',1)).toBe('0100-01');
 expect(addMonths('0100-01',-1)).toBe('0099-12');
 expect(addMonths('0000-01',1)).toBe('0000-02');
});
it('builds historical calendars using the actual year and leap-year rules',()=>{
 expect(monthCalendarDays('0000-02').filter(Boolean)).toHaveLength(29);
 expect(monthCalendarDays('0099-02').filter(Boolean)).toHaveLength(28);
 expect(monthCalendarDays('0099-01').indexOf('0099-01-01')).toBe((new Date('0099-01-01T12:00:00').getDay()+6)%7);
});
it('rejects duration values that cannot preserve whole-second precision',()=>{
 expect(validateEntry('duration',Number.MAX_SAFE_INTEGER,'2025-01-01')).toBeNull();
 expect(validateEntry('duration',Number.MAX_SAFE_INTEGER+1,'2025-01-01')).toMatch(/whole seconds/);
});

it('keeps monthly and yearly analytics in the original historical century',()=>{
 const today='0099-03-05';
 expect(buildInsightWindow('year',today,today).buckets.map(bucket=>bucket.key)).toEqual(['0099-01','0099-02','0099-03']);
 expect(buildTimeBuckets('months',today).at(-1)?.key).toBe('0099-03');
 expect(buildTimeBuckets('years',today).at(-1)?.dates.has('0099-03-05')).toBe(true);
 expect(buildDetailWindow('year',today,today,[]).start).toBe('0099-01-01');
 expect(buildDetailWindow('all',today,today,[]).buckets[0].dates.has(today)).toBe(true);
 expect(buildHistoryWindow('year',today,today).start).toBe('0094-01-01');
 expect(buildTimelineBuckets('month',today,3)[0].key).toBe('0099-01-01');
 expect(shiftInsightAnchor('0099-03-05','year',1)).toBe('0100-01-01');
 expect(historyWeekLabel('0099-01-05')).toBe('2 99');
});

it('includes year-zero imported history in the complete detail window',()=>{
 const entry={localDate:'0000-02-29'} as Entry;
 const window=buildDetailWindow('all','0001-01-01','0001-01-01',[entry]);
 expect(window.start).toBe('0000-01-01');
 expect(window.buckets).toHaveLength(2);
 expect(window.buckets[0].dates.size).toBe(366);
 expect(window.buckets[0].dates.has(entry.localDate)).toBe(true);
 expect(window.buckets[1].dates.size).toBe(1);
});
