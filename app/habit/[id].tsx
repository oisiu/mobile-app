import { topLevelAncestor } from '@/domain/tree';
import { useApp } from '@/features/AppProvider';
import { ExistingHabitEditor } from '@/features/habitEditor/ExistingHabitEditor';
import { NewHabitEditor } from '@/features/habitEditor/NewHabitEditor';
import { s } from '@/features/habitEditor/editorStyles';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function HabitEditor() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    isNew = id === 'new',
    { ready, habits, entries, repo, refresh, showSuccess, palette: c } = useApp();
  if (!ready)
    return (
      <View style={[s.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  if (isNew) return <NewHabitEditor habits={habits} c={c} repo={repo} refresh={refresh} showSuccess={showSuccess} />;
  const root = topLevelAncestor(habits, id);
  if (!root)
    return (
      <View style={[s.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>{t('categoryNotFound')}</Text>
      </View>
    );
  return (
    <ExistingHabitEditor
      key={root.id}
      root={root}
      habits={habits}
      entries={entries}
      repo={repo}
      refresh={refresh}
      showSuccess={showSuccess}
      c={c}
    />
  );
}
