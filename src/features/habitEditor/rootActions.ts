import type { Habit } from '@/domain/types';
import type { useHabitMutation } from '@/features/useHabitMutation';
import { t } from '@/i18n';
import { router } from 'expo-router';
import type { Dispatch,RefObject,SetStateAction } from 'react';
import { Alert } from 'react-native';
import type { EditorServices } from './editorTypes';

type Options={
  root:Habit;
  repo:EditorServices['repo'];
  mutation:ReturnType<typeof useHabitMutation>;
  dirty:boolean;
  savingRef:RefObject<boolean>;
  confirming:RefObject<boolean>;
  setReviewing:Dispatch<SetStateAction<boolean>>;
  allowLeave:()=>void;
  showSuccess:EditorServices['showSuccess'];
};

export function createRootActions({root,repo,mutation,dirty,savingRef,confirming,setReviewing,allowLeave,showSuccess}:Options){
  const restoreRoot=async()=>{
    if(!repo||!root.archivedAt||savingRef.current||mutation.pending.current||confirming.current)return;
    try{
      if(dirty){
        confirming.current=true;setReviewing(true);
        const confirmed=await new Promise<boolean>(resolve=>Alert.alert(t('archiveDraftTitle'),t('archiveDraftHelp'),[
          {text:t('keepEditing'),style:'cancel',onPress:()=>resolve(false)},
          {text:t('restoreWithoutSaving'),style:'destructive',onPress:()=>resolve(true)},
        ],{cancelable:true,onDismiss:()=>resolve(false)}));
        confirming.current=false;setReviewing(false);
        if(!confirmed)return;
      }
      await mutation.run(()=>repo.archive(root.id,false),()=>{allowLeave();showSuccess(t('habitRestored',{name:`${root.emoji} ${root.name}`.trim()}));router.dismissTo('/(tabs)')});
    }catch(error){confirming.current=false;setReviewing(false);Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
  };
  const removeRoot=async()=>{
    if(!repo||savingRef.current||mutation.pending.current||confirming.current)return;
    confirming.current=true;setReviewing(true);
    try{
      const impact=await repo.deletionImpact(root.id);
      Alert.alert(`${t('delete')} “${root.name}”?`,t('deletionSummary',{habits:impact.habits,entries:impact.entries}),[
        {text:t('cancel'),style:'cancel',onPress:()=>{confirming.current=false;setReviewing(false)}},
        {text:t('delete'),style:'destructive',onPress:async()=>{try{await mutation.run(()=>repo.remove(root.id),()=>{allowLeave();showSuccess(t('habitDeleted',{name:`${root.emoji} ${root.name}`.trim()}));router.dismissTo('/(tabs)')})}catch(error){Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}finally{confirming.current=false;setReviewing(false)}}},
      ],{cancelable:true,onDismiss:()=>{confirming.current=false;setReviewing(false)}});
    }catch(error){confirming.current=false;setReviewing(false);Alert.alert(t('couldNotSave'),error instanceof Error?error.message:String(error))}
  };
  return {restoreRoot,removeRoot};
}
