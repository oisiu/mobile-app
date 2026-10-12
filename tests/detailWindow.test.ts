import { expect,it } from 'vitest';
import { buildDetailWindow,shiftDetailAnchor } from '../src/domain/detailWindow';
import { Entry } from '../src/domain/types';
const record=(localDate:string)=>({localDate} as Entry);
it('uses daily week/month buckets and clips future dates',()=>{
 const week=buildDetailWindow('week','2026-10-12','2026-10-12',[]);
 expect(week.buckets).toHaveLength(7);expect(week.buckets[1].dates.size).toBe(0);
 const month=buildDetailWindow('month','2024-02-29','2026-10-12',[]);
 expect(month.buckets).toHaveLength(29);expect(month.end).toBe('2024-02-29');
});
it('groups natural quarters into three monthly buckets and navigates year boundaries',()=>{
 const quarter=buildDetailWindow('quarter','2026-10-12','2026-10-12',[]);
 expect(quarter.start).toBe('2026-10-01');expect(quarter.end).toBe('2026-10-12');
 expect(quarter.buckets.map(bucket=>bucket.key)).toEqual(['2026-10','2026-11','2026-12']);
 expect(quarter.buckets[0].dates.size).toBe(12);expect(quarter.buckets[1].dates.size).toBe(0);
 const past=buildDetailWindow('quarter','2024-02-01','2026-10-12',[]);
 expect(past.end).toBe('2024-03-31');expect(past.buckets[1].dates.size).toBe(29);
 expect(shiftDetailAnchor('quarter','2026-01-01',-1,'2026-10-12')).toBe('2025-10-01');
});
it('shows twelve months for a year and every recorded year for all history',()=>{
 expect(buildDetailWindow('year','2025-05-01','2026-10-12',[]).buckets).toHaveLength(12);
 const all=buildDetailWindow('all','2026-10-12','2026-10-12',[record('2018-03-01'),record('2027-01-01')]);
 expect(all.start).toBe('2018-01-01');expect(all.buckets).toHaveLength(9);expect(all.end).toBe('2026-10-12');
 expect(buildDetailWindow('all','2026-10-12','2026-10-12',[]).buckets).toHaveLength(1);
});
it('moves each shared period and clamps at today',()=>{
 expect(shiftDetailAnchor('week','2026-10-12',-1,'2026-10-12')).toBe('2026-10-05');
 expect(shiftDetailAnchor('month','2026-10-12',-1,'2026-10-12')).toBe('2026-09-01');
 expect(shiftDetailAnchor('year','2026-10-12',-1,'2026-10-12')).toBe('2025-01-01');
 expect(shiftDetailAnchor('year','2026-10-12',1,'2026-10-12')).toBe('2026-10-12');
 expect(shiftDetailAnchor('all','2019-01-01',-1,'2026-10-12')).toBe('2026-10-12');
});
