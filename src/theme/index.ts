export const light={bg:'#F2F2F7',card:'#FFFFFF',text:'#1C1C1E',muted:'#63666B',accent:'#356B50',onAccent:'#FFFFFF',soft:'#DDE9E2',line:'#E1E3E6',danger:'#9A504B'};
export const dark={bg:'#101112',card:'#1C1E20',text:'#F0F4F1',muted:'#9EAAA4',accent:'#80B89E',onAccent:'#101112',soft:'#263B31',line:'#343638',danger:'#E49A93'};

export const mainTitle={fontSize:32,lineHeight:38,fontWeight:'700',letterSpacing:-0.8,flexShrink:1} as const;

// Approach the soft surface gradually, keeping deep trees readable in either theme.
export function depthBackground(card:string,soft:string,depth:number){
  const amount=0.7*depth/(depth+1);
  return '#'+[1,3,5].map(offset=>{
    const base=parseInt(card.slice(offset,offset+2),16),tint=parseInt(soft.slice(offset,offset+2),16);
    return Math.round(base+(tint-base)*amount).toString(16).padStart(2,'0');
  }).join('');
}
