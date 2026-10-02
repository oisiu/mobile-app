import { InsightPeriod,InsightWindow } from './analytics';
import { buildHistoryWindow,historyWeekLabel,shiftHistoryAnchor } from './history';
import { addDays } from '../utils/dates';

export function buildStrengthWindow(period:InsightPeriod,anchor:string,today:string):InsightWindow{
  return buildHistoryWindow(period,anchor,today);
}

export function shiftStrengthAnchor(anchor:string,period:InsightPeriod,amount:number,today:string):string{
  return shiftHistoryAnchor(anchor,period,amount,today);
}
export function strengthWindowLabel(period:InsightPeriod,anchor:string,start:string,includeWeekNumber=true):string{
  if(period==='year')return anchor.slice(0,4);
  const month=(date:string)=>{const label=new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(new Date(`${date.slice(0,7)}-01T12:00:00`));return label.charAt(0).toLocaleUpperCase()+label.slice(1)};
  if(period==='month')return month(anchor);
  if(period==='quarter')return `${month(start)} – ${month(anchor)}`;
  const end=addDays(start,6);
  const full=(date:string)=>`${Number(date.slice(-2))}/${date.slice(5,7)}/${date.slice(0,4)}`;
  const first=start.slice(0,7)===end.slice(0,7)?String(Number(start.slice(-2))):start.slice(0,4)===end.slice(0,4)?`${Number(start.slice(-2))}/${start.slice(5,7)}`:full(start);
  const range=`${first}-${full(end)}`;
  return includeWeekNumber?`${historyWeekLabel(start)} · ${range}`:range;
}
