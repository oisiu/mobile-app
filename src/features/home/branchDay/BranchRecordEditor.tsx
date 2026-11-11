import type { Habit } from '@/domain/types';
import type { CalendarDraft } from '@/features/insights/calendarEntry';
import { t } from '@/i18n';
import type { light } from '@/theme';
import { Text, TextInput } from '@/theme/Typography';
import { Pressable, Switch, View } from 'react-native';
import { styles as s } from './branchDayStyles';
import type { BranchRecord } from './useBranchDayEditor';

type Props = {
  record: BranchRecord;
  root: Habit;
  draft: CalendarDraft;
  dateText: string;
  checked: boolean;
  locked: boolean;
  c: typeof light;
  onToggle: (checked: boolean) => void;
  onValue: (value: string) => void;
  onUnit: (unit: CalendarDraft['unit']) => void;
};
export function branchRecordLabel(path: Habit[]) {
  return path.map(habit => (habit.isGeneral ? t('branchDirectShort') : habit.name)).join(' › ');
}
export function BranchRecordEditor({
  record,
  root,
  draft,
  dateText,
  checked,
  locked,
  c,
  onToggle,
  onValue,
  onUnit,
}: Props) {
  const { path, habit } = record;
  const name = branchRecordLabel(path);
  const visibleHabit = habit.isGeneral ? (path[path.length - 2] ?? habit) : habit;
  const trail = path
    .slice(0, -1)
    .filter(item => item.id !== root.id)
    .map(item => item.name)
    .join(' › ');
  return (
    <View style={[s.record, { borderColor: c.line }]}>
      <View style={s.row}>
        <Text style={{ fontSize: 24 }}>{visibleHabit.emoji}</Text>
        <View style={s.path}>
          <Text style={{ color: c.text, fontWeight: '600' }}>
            {habit.isGeneral ? t('branchDirectShort') : habit.name}
          </Text>
          {!!trail && <Text style={{ color: c.muted, fontSize: 12 }}>{trail}</Text>}
        </View>
        <Switch
          trackColor={{ true: c.accent }}
          disabled={locked}
          accessibilityLabel={t('branchRecordSwitch', { name, date: dateText })}
          accessibilityState={{ checked, disabled: locked }}
          value={checked}
          onValueChange={onToggle}
        />
      </View>
      {root.type !== 'boolean' && checked && (
        <>
          {root.type === 'duration' && (
            <View style={s.actions}>
              {(['minutes', 'hours'] as const).map(unit => (
                <Pressable
                  key={unit}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: draft.unit === unit, disabled: locked }}
                  disabled={locked}
                  onPress={() => onUnit(unit)}
                  style={[s.button, { backgroundColor: draft.unit === unit ? c.accent : c.soft }]}
                >
                  <Text style={{ color: draft.unit === unit ? 'white' : c.text }}>{t(unit)}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            editable={!locked}
            accessibilityLabel={`${name}, ${habit.type === 'duration' ? t(draft.unit) : t('value')}`}
            keyboardType="decimal-pad"
            value={draft.value}
            onChangeText={onValue}
            style={[s.input, { color: c.text, borderColor: c.line }]}
          />
        </>
      )}
    </View>
  );
}
