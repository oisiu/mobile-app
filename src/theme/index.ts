export const light={bg:'#F6F7F2',card:'#FFFFFF',text:'#1F2925',muted:'#78827D',accent:'#4E7C67',onAccent:'#FFFFFF',soft:'#DDE9E2',line:'#E5E9E5',danger:'#9A504B'};
export const dark={bg:'#111714',card:'#1A231F',text:'#F0F4F1',muted:'#9EAAA4',accent:'#80B89E',onAccent:'#111714',soft:'#263B31',line:'#2B3731',danger:'#E49A93'};

// Use the platform system font consistently across the four main tab headings.
export const mainTitle={fontSize:24,fontWeight:'700',letterSpacing:0} as const;

// Approach the soft surface gradually, keeping deep trees readable in either theme.
export function depthBackground(card:string,soft:string,depth:number){
  const amount=0.7*depth/(depth+1);
  return '#'+[1,3,5].map(offset=>{
    const base=parseInt(card.slice(offset,offset+2),16),tint=parseInt(soft.slice(offset,offset+2),16);
    return Math.round(base+(tint-base)*amount).toString(16).padStart(2,'0');
  }).join('');
}
