import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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
  const [expanded, setExpanded] = useState(false);
  const status = isHidden ? t('visibilityHidden') : hideFromOverview ? t('visibilityOverviewHidden') : undefined;
  return (
    <View style={[s.panel, { backgroundColor: c.card }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('visibility')}
        accessibilityValue={status ? { text: status } : undefined}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(current => !current)}
        style={s.row}
      >
        <Ionicons name={status ? 'eye-off-outline' : 'eye-outline'} size={19} color={c.accent} accessible={false} />
        <Text style={[s.label, { color: c.text }]}>{t('visibility')}</Text>
        {status && <Text style={[s.status, { color: c.muted }]}>{status}</Text>}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={c.muted} accessible={false} />
      </TouchableOpacity>
      {expanded && (
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }}>
          <VisibilityToggle value={hideFromOverview} onChange={onOverviewChange} c={c} />
          <VisibilityToggle value={isHidden} onChange={onHiddenChange} c={c} complete />
        </View>
      )}
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
      style={s.row}
    >
      <Ionicons
        name={complete ? 'eye-off-outline' : 'pie-chart-outline'}
        size={18}
        color={value ? c.accent : c.muted}
        accessible={false}
      />
      <Text style={[s.label, { color: c.text }]}>{t(complete ? 'hideCompletely' : 'hideFromOverview')}</Text>
      <Ionicons
        name={value ? 'checkbox' : 'square-outline'}
        size={18}
        color={value ? c.accent : c.muted}
        accessible={false}
      />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  panel: { borderRadius: 15 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  label: { flex: 1, fontWeight: '600', fontSize: 14 },
  status: { flexShrink: 1, textAlign: 'right', fontSize: 12 },
});
