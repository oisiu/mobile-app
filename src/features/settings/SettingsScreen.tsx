import { openPopover, type PopoverAnchor } from '@/features/AnchoredPopover';
import { useApp } from '@/features/AppProvider';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AdvancedSection } from './AdvancedSection';
import { AppearanceSection } from './AppearanceSection';
import { ExportScopePopover } from './ExportScopePopover';
import { HelpSection } from './HelpSection';
import { HiddenCategories } from './HiddenCategories';
import { ImportGuidePopover } from './ImportGuidePopover';
import { SettingsAction } from './SettingsAction';
import { settingsStyles as s } from './settingsStyles';
import { useSettingsData } from './useSettingsData';

export default function SettingsScreen() {
  const { palette: c } = useApp(),
    data = useSettingsData();
  const [popoverAnchor, setPopoverAnchor] = useState<PopoverAnchor | null>(null);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const dataDisabled = data.exporting || data.importing || data.deleting || data.unavailable;
  return (
    <>
      <ScrollView style={[s.page, { backgroundColor: c.bg }]} contentContainerStyle={s.content}>
        <View style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={[s.title, { color: c.text }]}>{t('settings')}</Text>
        </View>
        <AppearanceSection />
        <Text accessibilityRole="header" style={[s.sectionTitle, { color: c.text }]}>
          {t('data')}
        </Text>
        <Text style={[s.intro, { color: c.muted }]}>{t('dataPrivacy')}</Text>
        <View style={[s.card, { backgroundColor: c.card }]}>
          <SettingsAction
            icon="document-text-outline"
            label={t('exportJson')}
            disabled={dataDisabled}
            onPress={event =>
              openPopover(event, anchor => {
                setPopoverAnchor(anchor);
                data.openExport('json');
              })
            }
            color={c.text}
          />
          <SettingsAction
            icon="grid-outline"
            label={t('exportCsv')}
            disabled={dataDisabled}
            onPress={event =>
              openPopover(event, anchor => {
                setPopoverAnchor(anchor);
                data.openExport('csv');
              })
            }
            color={c.text}
          />
          <SettingsAction
            icon="download-outline"
            label={t('importJson')}
            disabled={dataDisabled}
            onPress={data.importJson}
            color={c.accent}
          />
          <SettingsAction
            icon="sparkles-outline"
            label={t('convertExport')}
            onPress={event =>
              openPopover(event, anchor => {
                setPopoverAnchor(anchor);
                setShowImportGuide(true);
              })
            }
            color={c.text}
          />
        </View>
        <Text style={[s.note, { color: c.muted }]}>{t('safeMergeHelp')}</Text>
        <HiddenCategories />
        <HelpSection />
        <AdvancedSection deleting={data.deleting} disabled={dataDisabled} onDelete={data.deleteData} />
      </ScrollView>
      {data.exportKind && <ExportScopePopover anchor={popoverAnchor} data={data} />}
      <ImportGuidePopover visible={showImportGuide} anchor={popoverAnchor} onClose={() => setShowImportGuide(false)} />
    </>
  );
}
