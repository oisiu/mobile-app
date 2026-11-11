import { exportEntriesCsv, selectExportCategory } from '@/domain/export';
import { assertImportFileSize } from '@/domain/import';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import { clearTransferCache } from './transferCache';

export type ExportKind = 'json' | 'csv';
export function useSettingsData() {
  const { repo, refresh, habits, entries } = useApp();
  const [deleting, setDeleting] = useState(false),
    deletePending = useRef(false);
  const [exportScope, setExportScope] = useState<string[] | null>(null);
  const [exportKind, setExportKind] = useState<ExportKind | null>(null);
  const [exporting, setExporting] = useState(false),
    exportPending = useRef(false);
  const [importing, setImporting] = useState(false),
    importPending = useRef(false),
    importWriting = useRef(false);
  const exportRoots = habits
    .filter(habit => habit.parentId === null && !habit.isGeneral)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const blocked = () => !repo || exportPending.current || importPending.current || deletePending.current;
  const openExport = (kind: ExportKind) => {
    if (blocked()) return;
    Keyboard.dismiss();
    setExportScope(null);
    setExportKind(kind);
  };
  const closeExport = () => {
    if (!exportPending.current) setExportKind(null);
  };
  const cancelExport = () => setExportKind(null);
  const toggleExportScope = (id: string | null) => {
    if (exportPending.current) return;
    if (id === null) setExportScope(null);
    else
      setExportScope(current =>
        current?.includes(id) ? current.filter(value => value !== id) : [...(current ?? []), id],
      );
  };
  const deleteData = () => {
    if (!repo || blocked()) return;
    deletePending.current = true;
    Keyboard.dismiss();
    setDeleting(true);
    const cancel = {
      text: t('cancel'),
      style: 'cancel' as const,
      onPress: () => {
        deletePending.current = false;
        setDeleting(false);
      },
    };
    const options = { cancelable: false };
    const erase = async () => {
      try {
        await clearTransferCache();
        await repo.deleteAllData();
        await refresh();
        Alert.alert(t('deleteDataSuccess'));
      } catch {
        Alert.alert(t('deleteDataFailed'), t('deleteDataFailedHelp'));
      } finally {
        deletePending.current = false;
        setDeleting(false);
      }
    };
    const final = () =>
      Alert.alert(
        t('deleteDataFinal'),
        t('deleteDataFinalHelp', {
          habits: habits.filter(habit => !habit.isGeneral).length,
          entries: entries.length,
        }),
        [cancel, { text: t('deleteAllData'), style: 'destructive', onPress: () => void erase() }],
        options,
      );
    const second = () =>
      Alert.alert(
        t('deleteDataSecond'),
        t('deleteDataSecondHelp'),
        [cancel, { text: t('continueDelete'), style: 'destructive', onPress: final }],
        options,
      );
    Alert.alert(
      t('deleteDataFirst'),
      t('deleteDataFirstHelp'),
      [cancel, { text: t('continueDelete'), style: 'destructive', onPress: second }],
      options,
    );
  };
  const share = async (kind: ExportKind) => {
    if (!repo || blocked()) return;
    exportPending.current = true;
    setExporting(true);
    try {
      await clearTransferCache();
      try {
        const snapshot = await repo.export(),
          data = selectExportCategory(snapshot, exportScope);
        const content = kind === 'json' ? JSON.stringify(data, null, 2) : exportEntriesCsv(data);
        const uri = `${FileSystem.cacheDirectory}oisiu-export.${kind}`;
        await FileSystem.writeAsStringAsync(uri, content);
        await Sharing.shareAsync(uri, { mimeType: kind === 'json' ? 'application/json' : 'text/csv' });
      } finally {
        await clearTransferCache();
      }
    } catch {
      Alert.alert(t('exportFailed'), t('exportFailedHelp'));
    } finally {
      exportPending.current = false;
      setExporting(false);
      setExportKind(null);
    }
  };
  const importJson = async () => {
    if (!repo || blocked()) return;
    importPending.current = true;
    setImporting(true);
    const finish = () => {
      importPending.current = false;
      importWriting.current = false;
      setImporting(false);
    };
    try {
      await clearTransferCache();
      const parsed = await (async () => {
        try {
          const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true,
          });
          if (result.canceled) return;
          assertImportFileSize(result.assets[0].size);
          const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
          assertImportFileSize(raw.length);
          return JSON.parse(raw);
        } finally {
          await clearTransferCache();
        }
      })();
      if (parsed === undefined) {
        finish();
        return;
      }
      Alert.alert(
        t('importConfirm'),
        t('importSummary', { habits: parsed.habits?.length ?? 0, entries: parsed.entries?.length ?? 0 }),
        [
          { text: t('cancel'), style: 'cancel', onPress: finish },
          {
            text: t('importAction'),
            onPress: async () => {
              if (!importPending.current || importWriting.current) return;
              importWriting.current = true;
              try {
                await repo.import(parsed);
                await refresh();
                Alert.alert(t('importComplete'));
              } catch {
                Alert.alert(t('importRejected'), t('importFailedHelp'));
              } finally {
                finish();
              }
            },
          },
        ],
        { cancelable: false },
      );
    } catch {
      finish();
      Alert.alert(t('fileReadFailed'), t('fileReadHelp'));
    }
  };
  return {
    unavailable: !repo,
    exportRoots,
    exportKind,
    exportScope,
    exporting,
    importing,
    deleting,
    openExport,
    closeExport,
    cancelExport,
    toggleExportScope,
    share,
    importJson,
    deleteData,
  };
}
