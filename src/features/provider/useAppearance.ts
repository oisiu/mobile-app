import { t } from '@/i18n';
import { dark, light } from '@/theme';
import Storage from 'expo-sqlite/kv-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, useColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

export function useAppearance() {
  const systemTheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [themeReady, setThemeReady] = useState(false);
  const themeWrites = useRef(Promise.resolve());
  const themeRequest = useRef(0);
  const persistedTheme = useRef<ThemeMode>('system');
  const hasSavedTheme = useRef(false);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    const request = ++themeRequest.current;
    setThemeModeState(mode);
    const write = themeWrites.current.then(async () => {
      try {
        await Storage.setItem('theme-mode', mode);
        persistedTheme.current = mode;
        hasSavedTheme.current = true;
      } catch {
        // Earlier failed writes must not undo a more recent user selection.
        if (request === themeRequest.current) {
          setThemeModeState(persistedTheme.current);
          Alert.alert(t('appearanceSaveFailed'), t('appearanceSaveFailedHelp'));
        }
      }
    });
    themeWrites.current = write;
    return write;
  }, []);

  useEffect(() => {
    Storage.getItem('theme-mode')
      .then(value => {
        if (value === 'system' || value === 'light' || value === 'dark') {
          // A delayed startup read may describe storage from before a completed write.
          if (!hasSavedTheme.current) persistedTheme.current = value;
          if (themeRequest.current === 0) setThemeModeState(value);
        }
      })
      .catch(() => {})
      .finally(() => setThemeReady(true));
  }, []);

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;
  const palette = resolvedTheme === 'dark' ? dark : light;
  return { themeReady, themeMode, setThemeMode, resolvedTheme, palette };
}
