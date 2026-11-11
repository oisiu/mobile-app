import { expect,it } from 'vitest';
import { historyLayout } from '../src/features/insights/historyLayout';

const base={width:320,bucketSize:'day' as const,timeline:false,showValues:true,valueLabels:['1'],tickLabels:['0','1'],count:7};
it('keeps a week in place but scrolls a dense month with fixed axes and readable labels',()=>{
 expect(historyLayout(base).scrollable).toBe(false);
 for(const count of [28,29,30,31]){
  const result=historyLayout({...base,width:240,count,valueLabels:['12']});
  expect(result.scrollable).toBe(true);expect(result.plotStart).toBe(0);
  expect(result.plotWidth).toBeGreaterThan(240-result.left);
  expect(result.slot).toBeGreaterThanOrEqual(12+6);expect(result.barWidth).toBeLessThan(result.slot);
 }
});
it('keeps empty periods and labels that fit in the viewport without scrolling',()=>{
 for(const options of [{count:0,valueLabels:[]},{count:31,valueLabels:[]},{count:12,bucketSize:'month' as const,valueLabels:['31']},{count:31,showValues:false}]){
  const result=historyLayout({...base,...options});expect(result.scrollable).toBe(false);expect(result.plotWidth).toBe(320);expect(Number.isFinite(result.slot)).toBe(true);
 }
});
it.each(['day','week','month','quarter','year'] as const)('preserves fixed-width detail bars and compact %s spacing',bucketSize=>{
 const result=historyLayout({...base,bucketSize,timeline:true,count:60});
 expect(result.scrollable).toBe(true);expect(result.barWidth).toBe(16);expect(result.labelStride).toBe(1);
 expect(result.slot).toBeGreaterThanOrEqual(bucketSize==='week'?45:27);
 expect(result.plotStart).toBe(bucketSize==='day'?34:0);
});
it('expands for long totals and axis labels but still fits short monthly timelines',()=>{
 const result=historyLayout({...base,timeline:true,count:60,valueLabels:['999.9K'],tickLabels:['100000']});
 expect(result.left).toBe(48);expect(result.slot).toBeGreaterThan(40);
 expect(historyLayout({...base,bucketSize:'month',count:3}).labelStride).toBe(1);
 expect(historyLayout({...base,bucketSize:'month',count:12}).labelStride).toBe(3);
});
