import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity,View } from 'react-native';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import type { ReactNode } from 'react';
import type { Palette } from './editorTypes';

export function ChildAddActions({onAdd,existing,c,nested=false}:{onAdd:()=>void;existing:ReactNode;c:Palette;nested?:boolean}){
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8}}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t(nested?'addLevel':'addChild')} onPress={onAdd}
      style={{minHeight:44,paddingHorizontal:12,borderRadius:12,backgroundColor:c.soft,flexDirection:'row',alignItems:'center',gap:6}}>
      <Ionicons name="add" size={18} color={c.accent} accessible={false}/>
      <Text style={{color:c.accent,fontSize:13,fontWeight:'600'}}>{t('newChildHabit')}</Text>
    </TouchableOpacity>
    {existing}
  </View>;
}

type ReorderProps={name:string;siblingIndex:number;siblingCount:number;onReorder:(direction:-1|1)=>void;c:Palette};
export function ChildReorderActions({name,siblingIndex,siblingCount,onReorder,c}:ReorderProps){
  if(siblingCount<2)return null;
  return <View style={{flexDirection:'row',justifyContent:'flex-end',gap:4}}>
    {([-1,1] as const).map(direction=>{
      const disabled=direction===-1?siblingIndex===0:siblingIndex===siblingCount-1;
      return <TouchableOpacity key={direction} accessibilityRole="button"
        accessibilityLabel={`${t(direction===-1?'moveUp':'moveDown')} ${name.trim()||t('newCategory')}`}
        accessibilityState={{disabled}} disabled={disabled} onPress={()=>{if(!disabled)onReorder(direction)}}
        style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',opacity:disabled?.3:1}}>
        <Ionicons name={direction===-1?'arrow-up':'arrow-down'} size={18} color={c.accent} accessible={false}/>
      </TouchableOpacity>;
    })}
  </View>;
}
