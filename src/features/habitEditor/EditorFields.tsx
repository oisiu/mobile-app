import type { DurationUnit } from '@/domain/entries';
import type { HabitColor } from '@/domain/habitAppearance';
import { habitNameLimit } from '@/domain/habitName';
import { HabitColorPicker } from '@/features/HabitColorPicker';
import { HabitNameCounter } from '@/features/HabitNameCounter';
import { t } from '@/i18n';
import { Text, TextInput } from '@/theme/Typography';
import { TouchableOpacity, View } from 'react-native';
import { s } from './editorStyles';
import type { Palette } from './editorTypes';

type HabitInputsProps = {
  name: string;
  emoji: string;
  color: HabitColor | null;
  onName: (value: string) => void;
  onEmoji: (value: string) => void;
  onColor: (value: HabitColor | null) => void;
  c: Palette;
};
export function HabitInputs({ name, emoji, color, onName, onEmoji, onColor, c }: HabitInputsProps) {
  return (
    <HabitColorPicker value={color ?? null} onChange={onColor} c={c}>
      {colorButton => (
        <View>
          <View style={s.nameRow}>
            <TextInput
              value={emoji}
              onChangeText={onEmoji}
              accessibilityLabel={t('habitEmoji')}
              accessibilityHint={t('emojiHelp')}
              style={[s.emoji, { backgroundColor: c.card, color: c.text }]}
            />
            <TextInput
              value={name}
              onChangeText={onName}
              accessibilityLabel={t('habitName')}
              accessibilityHint={t('habitNameLimitHelp', { limit: habitNameLimit })}
              placeholder={t('habitName')}
              placeholderTextColor={c.muted}
              style={[s.input, { backgroundColor: c.card, color: c.text }]}
            />
            {colorButton}
          </View>
          <HabitNameCounter name={name} c={c} />
        </View>
      )}
    </HabitColorPicker>
  );
}
export function DurationUnitPicker({
  unit,
  onChange,
  c,
}: {
  unit: DurationUnit;
  onChange: (unit: DurationUnit) => void;
  c: Palette;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('durationUnit')}
      style={{ flexDirection: 'row', gap: 2, padding: 2, borderRadius: 11, backgroundColor: c.bg }}
    >
      {(['minutes', 'hours'] as const).map(option => {
        const selected = unit === option;
        return (
          <TouchableOpacity
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={t(option)}
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[s.unitButton, { backgroundColor: selected ? c.accent : 'transparent' }]}
          >
            <Text style={{ color: selected ? c.onAccent : c.text, fontSize: 12, textAlign: 'center' }}>
              {t(option)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
