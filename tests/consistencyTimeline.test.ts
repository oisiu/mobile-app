import { expect,it } from 'vitest';
import { buildTimelineBuckets } from '../src/domain/chartTimeline';

it('uses numeric day labels across month and leap-year boundaries',()=>{
 const buckets=buildTimelineBuckets('day','2024-03-02',4);
 expect(buckets.map(bucket=>bucket.label)).toEqual(['28','29','1','2']);
 expect(buckets.map(bucket=>[...bucket.dates])).toEqual([['2024-02-28'],['2024-02-29'],['2024-03-01'],['2024-03-02']]);
});
it('groups complete natural months and clips the current month at today',()=>{
 const buckets=buildTimelineBuckets('month','2024-03-02',3);
 expect(buckets.map(bucket=>bucket.key)).toEqual(['2024-01-01','2024-02-01','2024-03-01']);
 expect(buckets.map(bucket=>bucket.dates.size)).toEqual([31,29,2]);
});
it('labels quarters by their first month and preserves earlier years',()=>{
 const buckets=buildTimelineBuckets('quarter','2026-10-22',5);
 expect(buckets.map(bucket=>bucket.key)).toEqual(['2025-10-01','2026-01-01','2026-04-01','2026-07-01','2026-10-01']);
 expect(buckets.at(-1)?.dates.size).toBe(22);
 expect(buckets[1].label).toBe(new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date('2026-01-01T12:00:00')).replace(/[.\s]/g,'').slice(0,3));
});
it('groups years and preserves existing buckets when more history is loaded',()=>{
 const buckets=buildTimelineBuckets('year','2024-03-02',3);
 expect(buckets.map(bucket=>bucket.label)).toEqual(['2022','2023','2024']);
 expect(buckets.map(bucket=>bucket.dates.size)).toEqual([365,365,62]);
 expect(buildTimelineBuckets('year','2024-03-02',6).slice(-3)).toEqual(buckets);
});

it('groups Monday–Sunday weeks across years and excludes days after today',()=>{
 const buckets=buildTimelineBuckets('week','2026-01-01',2);
 expect(buckets.map(bucket=>bucket.key)).toEqual(['2025-12-22','2025-12-29']);
 expect(buckets.map(bucket=>bucket.dates.size)).toEqual([7,4]);
 expect([...buckets[1].dates]).toEqual(['2025-12-29','2025-12-30','2025-12-31','2026-01-01']);
 expect(buckets[1].label).toBe('29 '+new Intl.DateTimeFormat(undefined,{month:'short'}).format(new Date('2025-12-29T12:00:00')).replace(/\./g,''));
 expect(buildTimelineBuckets('week','2026-01-01',5).slice(-2)).toEqual(buckets);
 expect(buildTimelineBuckets('week','2026-01-05',1)[0].dates.size).toBe(1);
 expect(buildTimelineBuckets('week','2026-01-04',1)[0].dates.size).toBe(7);
});
