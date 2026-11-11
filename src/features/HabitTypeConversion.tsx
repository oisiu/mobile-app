import type { HabitType } from '@/domain/types';
import type { CalendarDraft } from '@/features/insights/calendarEntry';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { TouchableOpacity, View } from 'react-native';
import { HistoryConversionInput } from './habitEditor/HistoryConversionInput';
import { s } from './habitEditor/editorStyles';
import type { Palette } from './habitEditor/editorTypes';

const types: HabitType[] = ['boolean', 'number', 'duration'];

/** Three equal type buttons with one short example of the selected type. */
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
    <View>
      <Text style={[s.label, { color: c.muted }]}>{t('type')}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('changeHabitType')}
        style={{ flexDirection: 'row', gap: 8 }}
      >
        {types.map(option => {
          const selected = type === option;
          return (
            <TouchableOpacity
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={t(option)}
              accessibilityState={{ selected }}
              onPress={() => onType(option)}
              style={{
                flex: 1,
                minHeight: 48,
                paddingHorizontal: 8,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                backgroundColor: selected ? c.accent : c.card,
              }}
            >
              <Text style={{ color: selected ? c.onAccent : c.text, fontWeight: '600', textAlign: 'center' }}>
                {t(option === 'boolean' ? 'typeYesNo' : option)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={{ color: c.muted, fontSize: 12, marginTop: 8 }}>
        {t(`${type}ShortExample`)}
      </Text>
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
  const help = !hasHistory
    ? 'noHistoryToConvert'
    : type === 'boolean'
      ? 'historyToBooleanHelp'
      : from === 'boolean'
        ? 'historyFromBooleanHelp'
        : 'historyNumericConversionHelp';
  return (
    <View>
      <HabitTypeSelector type={type} onType={onType} c={c} />
      {type !== from && (
        <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: c.card }}>
          <Text style={{ color: c.text, lineHeight: 21 }}>{t(help)}</Text>
          {hasHistory && type !== 'boolean' && (
            <HistoryConversionInput from={from} type={type} draft={draft} onDraft={onDraft} c={c} />
          )}
        </View>
      )}
    </View>
  );
}
