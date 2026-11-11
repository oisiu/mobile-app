import type { BucketSize } from '@/domain/analytics';

type Options={width:number;bucketSize:BucketSize;timeline:boolean;showValues:boolean;valueLabels:string[];tickLabels:string[];count:number};
export function historyLayout({width,bucketSize,timeline,showValues,valueLabels,tickLabels,count}:Options){
  const left=Math.max(28,...tickLabels.map(label=>label.length*6+12));
  const valueWidth=Math.max(0,...valueLabels.map(label=>label.length*6));
  const overviewSpacing=Math.max(18,valueWidth+8);
  const scrollable=timeline||(showValues&&valueLabels.length>0&&count*overviewSpacing>width-left-4);
  const spacing=timeline
    ?Math.max(bucketSize==='day'?28:bucketSize==='week'?46:bucketSize==='month'||bucketSize==='quarter'?28:40,valueWidth+10)
    :overviewSpacing;
  const plotStart=scrollable?(timeline&&bucketSize==='day'?34:0):left;
  const plotWidth=scrollable?Math.max(width-left,count*spacing+plotStart):width;
  const right=Math.max(plotStart+1,plotWidth-4),slot=(right-plotStart)/Math.max(1,count);
  const labelStride=timeline?1:bucketSize==='month'?(count<=3?1:3):bucketSize==='day'&&count>7?Math.max(1,Math.ceil(24/slot)):1;
  return {left,scrollable,plotStart,plotWidth,right,slot,labelStride,barWidth:timeline?16:Math.min(16,slot*.8)};
}
