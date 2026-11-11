import type { HabitColor } from '@/domain/habitAppearance';
import { habitNameLimit } from '@/domain/habitName';
import { HabitColorPicker } from '@/features/HabitColorPicker';
import { HabitNameCounter } from '@/features/HabitNameCounter';
import { t } from '@/i18n';
import { TextInput } from '@/theme/Typography';
import { View } from 'react-native';
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
