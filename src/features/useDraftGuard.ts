import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { usePreventRemove } from 'expo-router';
import { t } from '@/i18n';

export function useDraftGuard(dirty: boolean, busy?: { current: boolean }) {
  const [allowed, setAllowed] = useState(false);
  const prompting = useRef(false);
  const disablePrevention = usePreventRemove(!allowed && (dirty || !!busy?.current), ({ repeat }) => {
    if (busy?.current || prompting.current) return;
    prompting.current = true;
    Alert.alert(
      t('discardTitle'),
      t('discardMessage'),
      [
        {
          text: t('keepEditing'),
          style: 'cancel',
          onPress: () => {
            prompting.current = false;
          },
        },
        {
          text: t('discard'),
          style: 'destructive',
          onPress: () => {
            prompting.current = false;
            setAllowed(true);
            repeat();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          prompting.current = false;
        },
      },
    );
  });
  return () => {
    setAllowed(true);
    disablePrevention();
  };
}
