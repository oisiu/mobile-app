import React from 'react';
import { StyleSheet,View } from 'react-native';
import Svg,{Path} from 'react-native-svg';

export function CalendarDayBackground({colors}:{colors:string[]}){
  if(!colors.length)return null;
  if(colors.length===1)return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{backgroundColor:colors[0],opacity:.3}]}/>;
  return <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill,{opacity:.3}]}>
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" accessible={false}>
      {colors.map((color,index)=>{
        const start=index/colors.length*2*Math.PI-Math.PI/2,end=(index+1)/colors.length*2*Math.PI-Math.PI/2;
        // Extend sectors beyond the corners so they fill the rounded day cell.
        const point=(angle:number)=>`${50+100*Math.cos(angle)} ${50+100*Math.sin(angle)}`;
        return <Path key={index} d={`M50 50 L${point(start)} A100 100 0 0 1 ${point(end)} Z`} fill={color}/>;
      })}
    </Svg>
  </View>;
}
