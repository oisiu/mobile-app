export const light={bg:'#F3E8D7',card:'#F9F1E6',text:'#280003',muted:'#50372F',accent:'#280003',onAccent:'#F3E8D7',soft:'#BAA898',line:'#CDBDAC',danger:'#9A504B',navigation:{home:'#280003',calendar:'#513336',insights:'#624347',settings:'#705043'}};
export const dark={bg:'#280003',card:'#3A1518',text:'#F3E8D7',muted:'#BAA898',accent:'#F3E8D7',onAccent:'#280003',soft:'#4C292B',line:'#6C4B48',danger:'#E49A93',navigation:{home:'#F3E8D7',calendar:'#DFCCB5',insights:'#D0BAA4',settings:'#BAA898'}};

export const mainTitle={fontSize:32,lineHeight:38,fontWeight:'700',letterSpacing:-0.8,flexShrink:1} as const;

// Approach the soft surface gradually, keeping deep trees readable in either theme.
export function depthBackground(card:string,soft:string,depth:number){
  const amount=0.7*depth/(depth+1);
  return '#'+[1,3,5].map(offset=>{
    const base=parseInt(card.slice(offset,offset+2),16),tint=parseInt(soft.slice(offset,offset+2),16);
    return Math.round(base+(tint-base)*amount).toString(16).padStart(2,'0');
  }).join('');
}
