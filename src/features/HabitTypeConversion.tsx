import type { HabitType } from '@/domain/types';
import type { CalendarDraft } from '@/features/insights/calendarEntry';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { HistoryConversionInput } from './habitEditor/HistoryConversionInput';
import type { Palette } from './habitEditor/editorTypes';

const typeChoices = [
  { type: 'boolean', icon: 'checkmark-circle-outline', label: 'typeYesNo' },
  { type: 'number', icon: 'calculator-outline', label: 'number' },
  { type: 'duration', icon: 'time-outline', label: 'duration' },
] as const;

export function HabitTypeSelector({
  type,
  onType,
  c,
}: {
  type: HabitType;
  onType: (type: HabitType) => void;
  c: Palette;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('changeHabitType')}
      style={{ flexDirection: 'row', gap: 3, padding: 4, borderRadius: 15, backgroundColor: c.card }}
    >
      {typeChoices.map(({ type: option, icon, label }) => {
        const selected = type === option;
        const color = selected ? c.onAccent : c.text;
        return (
          <TouchableOpacity
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={t(label)}
            accessibilityHint={t(`${option}ShortExample`)}
            accessibilityState={{ selected }}
            onPress={() => onType(option)}
            style={{
              flex: 1,
              minHeight: 44,
              paddingHorizontal: 6,
              paddingVertical: 8,
              flexDirection: 'column',
              gap: 4,
              alignItems: 'center',
              borderRadius: 11,
              backgroundColor: selected ? c.accent : 'transparent',
            }}
          >
            <Ionicons name={icon} size={16} color={color} accessible={false} />
            <Text style={{ color, fontWeight: '600', textAlign: 'center', flexShrink: 1 }}>{t(label)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type Props = {
  from: HabitType;
  type: HabitType;
  onType: (type: HabitType) => void;
  draft: CalendarDraft;
  onDraft: (draft: CalendarDraft) => void;
  hasHistory: boolean;
  c: Palette;
};

/** Type selector for a saved habit; choosing another type reveals what happens to its history. */
export function HabitTypeConversion({ from, type, onType, draft, onDraft, c, hasHistory }: Props) {
  const help =
    type === 'boolean'
      ? 'historyToBooleanHelp'
      : from === 'boolean'
        ? 'historyFromBooleanHelp'
        : 'historyNumericConversionHelp';
  return (
    <View>
      <HabitTypeSelector type={type} onType={onType} c={c} />
      {type !== from && hasHistory && (
        <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: c.card }}>
          <Text style={{ color: c.text, lineHeight: 21 }}>{t(help)}</Text>
          {type !== 'boolean' && (
            <HistoryConversionInput from={from} type={type} draft={draft} onDraft={onDraft} c={c} />
          )}
        </View>
      )}
    </View>
  );
}
