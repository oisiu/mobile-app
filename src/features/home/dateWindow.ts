// Keep five visible days and five days of overscan on either side mounted.
// Spacers preserve the native scroll extent as this window moves.
export function homeDateWindow(firstDay:number,historyDays:number){
  return {start:Math.max(0,firstDay-5),end:Math.min(historyDays,firstDay+10)};
}
