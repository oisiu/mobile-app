import type { HabitType } from '@/domain/types';
import type { CalendarDraft } from '@/features/insights/calendarEntry';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { TouchableOpacity, View } from 'react-native';
import { HistoryConversionInput } from './habitEditor/HistoryConversionInput';
import type { Palette } from './habitEditor/editorTypes';

type Props = {
  from: HabitType;
  type: HabitType;
  onType: (type: HabitType) => void;
  draft: CalendarDraft;
  onDraft: (draft: CalendarDraft) => void;
  hasHistory: boolean;
  c: Palette;
};
export function HabitTypeConversion({ from, type, onType, draft, onDraft, c, hasHistory }: Props) {
  const help = !hasHistory
    ? 'noHistoryToConvert'
    : type === 'boolean'
      ? 'historyToBooleanHelp'
      : from === 'boolean'
        ? 'historyFromBooleanHelp'
        : 'historyNumericConversionHelp';
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={{ color: c.muted, fontSize: 13, marginBottom: 8 }}>{t('changeHabitType')}</Text>
      <Text style={{ color: c.muted, lineHeight: 20, marginBottom: 10 }}>{t('changeHabitTypeHelp')}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('changeHabitType')}
        style={{ flexDirection: 'row', gap: 8 }}
      >
        {(['boolean', 'number', 'duration'] as const).map(option => {
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
