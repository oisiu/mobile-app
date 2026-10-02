import { describe,expect,it } from 'vitest';
import { buildStrengthWindow,shiftStrengthAnchor,strengthWindowLabel } from '../src/domain/strengthWindow';

describe('Score periods',()=>{
  it('shows a whole calendar month with future days empty and leap days included',()=>{
    const current=buildStrengthWindow('month','2026-10-05','2026-10-05');
    expect(current.buckets).toHaveLength(31);
    expect(current.buckets[4].dates.size).toBe(1);
    expect(current.buckets[5].dates.size).toBe(0);
    expect(buildStrengthWindow('month','2024-02-01','2026-10-05').buckets).toHaveLength(29);
  });
  it('shows twelve monthly averages spanning the year boundary',()=>{
    const window=buildStrengthWindow('quarter','2026-10-05','2026-10-05');
    expect(window.start).toBe('2025-11-01');
    expect(window.buckets).toHaveLength(12);
    expect(window.buckets.at(-1)?.key).toBe('2026-10');
    expect(window.buckets.at(-1)?.dates.size).toBe(5);
    expect(window.buckets[1].dates.size).toBe(31);
    expect(strengthWindowLabel('quarter','2026-10-05',window.start)).toContain('2025');
    expect(strengthWindowLabel('quarter','2026-10-05',window.start)).toContain('2026');
  });
  it('moves months across years and blocks future navigation',()=>{
    expect(shiftStrengthAnchor('2026-01-31','month',-1,'2026-10-05')).toBe('2025-12-01');
    expect(shiftStrengthAnchor('2026-09-01','month',1,'2026-10-05')).toBe('2026-10-01');
    expect(shiftStrengthAnchor('2026-10-05','month',1,'2026-10-05')).toBe('2026-10-01');
    expect(shiftStrengthAnchor('2026-10-05','quarter',-1,'2026-10-05')).toBe('2025-10-01');
    expect(shiftStrengthAnchor('2025-10-01','quarter',1,'2026-10-05')).toBe('2026-10-01');
  });
  it('labels complete weeks, including month and year boundaries',()=>{
    expect(strengthWindowLabel('week','2026-10-05','2026-10-05')).toBe('41 2026 · 5-11/10/2026');
    expect(strengthWindowLabel('week','2026-09-28','2026-09-28')).toBe('40 2026 · 28/09-4/10/2026');
    expect(strengthWindowLabel('week','2025-12-29','2025-12-29')).toBe('1 2026 · 29/12/2025-4/01/2026');
    expect(buildStrengthWindow('week','2026-10-05','2026-10-05').buckets).toHaveLength(7);
    expect(shiftStrengthAnchor('2026-10-05','week',-1,'2026-10-05')).toBe('2026-09-28');
  });
  it('keeps six annual buckets and identifies the selected month and year',()=>{
    expect(buildStrengthWindow('year','2026-10-05','2026-10-05').buckets.map(bucket=>bucket.key)).toEqual(['2021','2022','2023','2024','2025','2026']);
    expect(shiftStrengthAnchor('2026-10-05','year',-1,'2026-10-05')).toBe('2020-01-01');
    expect(strengthWindowLabel('year','2026-10-05','2021-01-01')).toBe('2026');
    const label=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(new Date('2026-10-01T12:00:00'));
    expect(strengthWindowLabel('month','2026-10-05','2026-10-01')).toBe(label.charAt(0).toLocaleUpperCase()+label.slice(1));
  });
});
