import type { HabitType } from '@/domain/types';
import { changeCalendarUnit, type CalendarDraft } from '@/features/insights/calendarEntry';
import { t } from '@/i18n';
import { Text, TextInput } from '@/theme/Typography';
import { View } from 'react-native';
import { DurationUnitPicker } from './EditorFields';
import { s } from './editorStyles';
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
      <View style={s.valueRow}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          value={draft.value}
          onChangeText={value => onDraft({ ...draft, value: value.replace(',', '.') })}
          style={[s.numericInput, { color: c.text, backgroundColor: c.bg }]}
        />
        {showUnits && (
          <DurationUnitPicker unit={draft.unit} onChange={unit => onDraft(changeCalendarUnit(draft, unit))} c={c} />
        )}
      </View>
    </View>
  );
}
