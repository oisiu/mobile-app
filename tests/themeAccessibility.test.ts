import { habitAccentPalette,habitColorPalette } from '../src/theme/habitColors';
import { describe,expect,it } from 'vitest';
import { dark,depthBackground,light } from '../src/theme';

function luminance(color:string){
  const channels=[1,3,5].map(offset=>parseInt(color.slice(offset,offset+2),16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
function contrast(first:string,second:string){const values=[luminance(first),luminance(second)].sort((a,b)=>b-a);return (values[0]+0.05)/(values[1]+0.05)}

describe.each([{name:'light',palette:light},{name:'dark',palette:dark}])('$name palette readability',({palette})=>{
  it('keeps normal text and muted labels readable on grouped surfaces',()=>{
    for(const background of [palette.bg,palette.card,palette.soft]){
      expect(contrast(palette.text,background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.muted,background)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('keeps each navigation label readable on the footer',()=>{
    for(const color of Object.values(palette.navigation))expect(contrast(color,palette.card)).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps action labels readable and deeply nested rows bounded',()=>{
    expect(contrast(palette.onAccent,palette.accent)).toBeGreaterThanOrEqual(4.5);
    expect(depthBackground(palette.card,palette.soft,0)).toBe(palette.card.toLowerCase());
    for(const depth of [1,4,20,1000])expect(contrast(palette.text,depthBackground(palette.card,palette.soft,depth))).toBeGreaterThanOrEqual(4.5);
  });
});

it('keeps habit chart accents visible in both themes and white pie labels readable',()=>{
  for(const color of Object.values(habitAccentPalette)){
    expect(contrast('#FFFFFF',color)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color,dark.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(color,light.card)).toBeGreaterThanOrEqual(3);
  }
});

it('uses lighter swatches for every supported accent',()=>{
  for(const color of Object.keys(habitColorPalette) as (keyof typeof habitColorPalette)[]){
    expect(luminance(habitColorPalette[color])).toBeGreaterThan(luminance(habitAccentPalette[color]));
    expect(contrast(light.text,habitColorPalette[color])).toBeGreaterThanOrEqual(4.5);
  }
});