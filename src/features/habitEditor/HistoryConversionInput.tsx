import type { HabitType } from '@/domain/types';
import { changeCalendarUnit, type CalendarDraft } from '@/features/insights/calendarEntry';
import { t } from '@/i18n';
import { Text, TextInput } from '@/theme/Typography';
import { TouchableOpacity, View } from 'react-native';
import type { Palette } from './editorTypes';

type Props = {
  from: HabitType;
  type: HabitType;
  draft: CalendarDraft;
  onDraft: (draft: CalendarDraft) => void;
  c: Palette;
};
export function HistoryConversionInput({ from, type, draft, onDraft, c }: Props) {
  const label = t(
    from !== 'boolean' ? 'historyUnitDuration' : type === 'duration' ? 'historyDuration' : 'historyQuantity',
  );
  const showUnits = type === 'duration' || from === 'duration';
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: c.text, fontWeight: '600', marginBottom: 8 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        value={draft.value}
        onChangeText={value => onDraft({ ...draft, value: value.replace(',', '.') })}
        style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 10, color: c.text, backgroundColor: c.soft }}
      />
      {showUnits && (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('durationUnit')}
          style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}
        >
          {(['minutes', 'hours'] as const).map(unit => (
            <TouchableOpacity
              key={unit}
              accessibilityRole="radio"
              accessibilityLabel={t(unit)}
              accessibilityState={{ selected: draft.unit === unit }}
              onPress={() => onDraft(changeCalendarUnit(draft, unit))}
              style={{
                minHeight: 44,
                padding: 12,
                borderRadius: 10,
                backgroundColor: draft.unit === unit ? c.soft : 'transparent',
              }}
            >
              <Text style={{ color: c.text }}>{t(unit)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
