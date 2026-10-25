import { Text,type TextProps } from 'react-native-svg';

export function SvgText({fontWeight,...props}:TextProps){
  const weight=fontWeight==='bold'?700:Number(fontWeight??400);
  const fontFamily=weight>=800?'Manrope-ExtraBold':weight>=700?'Manrope-Bold':weight>=600?'Manrope-SemiBold':'Manrope-Regular';
  return <Text {...props} fontFamily={fontFamily} fontWeight="normal"/>;
}
