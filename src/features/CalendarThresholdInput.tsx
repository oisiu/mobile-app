import { Text, TextInput } from '@/theme/Typography';
import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { HabitType } from '@/domain/types';
import { calendarThresholdInput } from '@/domain/calendarThreshold';
import { light, dark } from '@/theme';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { DurationUnitPicker } from './habitEditor/EditorFields';
import { s } from './habitEditor/editorStyles';

export function CalendarThresholdInput({
  type,
  value,
  onChange,
  c,
  name,
}: {
  type: HabitType;
  value: number | null;
  onChange: (value: number | null) => void;
  c: typeof light | typeof dark;
  name: string;
}) {
  const [unit, setUnit] = useState<'minutes' | 'hours'>('minutes');
  const [text, setText] = useState(() => (value == null ? '' : String(value / (type === 'duration' ? 60 : 1))));
  const [showHelp, setShowHelp] = useState(false);
  if (type === 'boolean') return null;
  const change = (text: string) => {
    setText(text);
    onChange(calendarThresholdInput(type, text, unit));
  };
  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: 10, borderRadius: 15, backgroundColor: c.card, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="calendar-outline" size={17} color={c.accent} accessible={false} />
        <Text style={{ flex: 1, color: c.text, fontWeight: '600', fontSize: 14 }}>{t('calendarThreshold')}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('chartInfo', { name: t('calendarThresholdFor', { name }) })}
          accessibilityState={{ expanded: showHelp }}
          onPress={() => setShowHelp(current => !current)}
          style={s.iconButton}
        >
          <Ionicons name="information-circle-outline" size={19} color={c.muted} accessible={false} />
        </TouchableOpacity>
      </View>
      {showHelp && <Text style={{ color: c.muted, fontSize: 13 }}>{t('calendarThresholdHelp')}</Text>}
      <View style={s.valueRow}>
        <TextInput
          accessibilityLabel={t('calendarThresholdFor', { name })}
          accessibilityHint={t('calendarThresholdHelp')}
          value={text}
          onChangeText={change}
          placeholder={t('optional')}
          placeholderTextColor={c.muted}
          keyboardType="decimal-pad"
          style={[s.numericInput, { backgroundColor: c.bg, color: c.text }]}
        />
        {type === 'duration' && (
          <DurationUnitPicker
            unit={unit}
            onChange={option => {
              setUnit(option);
              if (value != null && Number.isFinite(value)) setText(String(value / (option === 'hours' ? 3600 : 60)));
            }}
            c={c}
          />
        )}
      </View>
    </View>
  );
}
