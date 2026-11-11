import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import type { Palette } from './editorTypes';

type Props = {
  hideFromOverview: boolean;
  onOverviewChange: (value: boolean) => void;
  isHidden: boolean;
  onHiddenChange: (value: boolean) => void;
  c: Palette;
};
export function HabitVisibility({ hideFromOverview, onOverviewChange, isHidden, onHiddenChange, c }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
      <VisibilityToggle value={hideFromOverview} onChange={onOverviewChange} c={c} />
      <VisibilityToggle value={isHidden} onChange={onHiddenChange} c={c} complete />
    </View>
  );
}

type VisibilityProps = { value: boolean; onChange: (value: boolean) => void; c: Palette; complete?: boolean };
function VisibilityToggle({ value, onChange, c, complete = false }: VisibilityProps) {
  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityLabel={t(complete ? 'hideCompletely' : 'hideFromOverview')}
      accessibilityHint={t(complete ? 'hideCompletelyHelp' : 'hideFromOverviewHelp')}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 10,
        borderRadius: 14,
        backgroundColor: value ? c.soft : c.card,
        borderWidth: 1,
        borderColor: value ? c.accent : c.line,
      }}
    >
      <Ionicons
        name={complete ? 'eye-off-outline' : 'pie-chart-outline'}
        size={18}
        color={value ? c.accent : c.muted}
        accessible={false}
      />
      <Text style={{ flex: 1, color: c.text, fontWeight: '600', fontSize: 13 }}>
        {t(complete ? 'hideCompletely' : 'hideFromOverview')}
      </Text>
      <Ionicons
        name={value ? 'checkbox' : 'square-outline'}
        size={18}
        color={value ? c.accent : c.muted}
        accessible={false}
      />
    </TouchableOpacity>
  );
}
