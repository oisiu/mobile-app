import { Text } from 'react-native';
import { habitNameLimit } from '@/domain/habitName';
import { t } from '@/i18n';
import { dark,light } from '@/theme';

export function HabitNameCounter({name,c}:{name:string;c:typeof light|typeof dark}){
  const count=Array.from(name.trim()).length;
  return <Text accessibilityLabel={t('habitNameCount',{count,limit:habitNameLimit})} style={{color:c.muted,fontSize:12,textAlign:'right',marginTop:4}}>{count}/{habitNameLimit}</Text>;
}
