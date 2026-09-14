// Center a week when possible; clamp at the loaded timeline's edges.
export function calendarScrollOffset(weekIndex:number,step:number,cellSize:number,viewportWidth:number,contentWidth:number){
  return Math.max(0,Math.min(Math.max(0,contentWidth-viewportWidth),weekIndex*step+cellSize/2-viewportWidth/2));
}
