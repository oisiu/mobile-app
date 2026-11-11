import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, TouchableOpacity, View } from 'react-native';
import { s, type Palette } from './homeStyles';

type Props = {
  c: Palette;
  firstDay: number;
  showHiddenCategories: boolean;
  toggleHiddenCategories: () => void;
  tapTitle: () => void;
  goToToday: () => void;
  pending: string | null;
  push: (href: string) => void;
};
export function HomeHeader({
  c,
  firstDay,
  showHiddenCategories,
  toggleHiddenCategories,
  tapTitle,
  goToToday,
  pending,
  push,
}: Props) {
  return (
    <View style={s.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Oi Siu"
        accessibilityHint={t('toggleHiddenCategoriesHint')}
        accessibilityState={{ expanded: showHiddenCategories }}
        accessibilityActions={[{ name: 'activate', label: t('toggleHiddenCategories') }]}
        onAccessibilityAction={toggleHiddenCategories}
        onPress={tapTitle}
        style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
      >
        <Text accessibilityRole="header" style={[s.brand, { color: c.text }]}>
          Oi Siu
        </Text>
      </Pressable>
      {firstDay > 0 && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={goToToday}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}
        >
          <Text style={{ color: c.accent, fontSize: 13 }}>{t('today')}</Text>
        </TouchableOpacity>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('add')}
        disabled={pending !== null}
        accessibilityState={{ disabled: pending !== null, busy: pending === '/habit/new' }}
        onPress={() => push('/habit/new')}
        style={({ pressed }) => [s.add, { backgroundColor: pressed ? c.soft : 'transparent' }]}
      >
        {({ pressed }) => <Ionicons name="add" size={20} color={pressed ? c.text : c.muted} />}
      </Pressable>
    </View>
  );
}
