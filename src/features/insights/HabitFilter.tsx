import type { Habit } from '@/domain/types';
import type { PopoverAnchor } from '@/features/AnchoredPopover';
import { SelectionPopover } from '@/features/SelectionPopover';
import { t } from '@/i18n';
import { depthBackground } from '@/theme';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { habitDepths } from './habitDepths';
import { ScrollView, TouchableOpacity } from 'react-native';
import { s, type Palette } from './detailStyles';

type FilterTarget = 'score' | 'history' | 'calendar' | 'streaks' | 'frequency';
type FilterModalProps = {
  anchor: PopoverAnchor | null;
  filter: FilterTarget | null;
  setFilter: (value: FilterTarget | null) => void;
  candidates: Habit[];
  scoreIds: Set<string>;
  historyIds: Set<string>;
  calendarIds: Set<string>;
  currentSingle: string;
  toggleMulti: (id: string) => void;
  setSingle: (id: string) => void;
  c: Palette;
};

export function FilterModal({
  anchor,
  filter,
  setFilter,
  candidates,
  scoreIds,
  historyIds,
  calendarIds,
  currentSingle,
  toggleMulti,
  setSingle,
  c,
}: FilterModalProps) {
  const depths = useMemo(() => habitDepths(candidates), [candidates]);
  const multi = filter === 'score' || filter === 'history' || filter === 'calendar';
  const selectedIds = filter === 'score' ? scoreIds : filter === 'calendar' ? calendarIds : historyIds;

  return (
    <SelectionPopover
      anchor={anchor}
      visible={!!filter}
      onClose={() => setFilter(null)}
      title={t(multi ? 'selectMultiple' : 'selectCategory')}
      hint={t(multi ? 'multipleHint' : 'singleHint')}
      c={c}
    >
      <ScrollView>
        {candidates.map(habit => {
          const depth = depths.get(habit.id)!;
          const selected = multi ? selectedIds.has(habit.id) : currentSingle === habit.id;
          const icon = selected
            ? multi
              ? 'checkbox'
              : 'radio-button-on'
            : multi
              ? 'square-outline'
              : 'radio-button-off';
          return (
            <TouchableOpacity
              key={habit.id}
              accessibilityRole={multi ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: selected }}
              onPress={() => (multi ? toggleMulti(habit.id) : setSingle(habit.id))}
              style={[
                s.filterRow,
                {
                  borderColor: c.line,
                  backgroundColor: depthBackground(c.card, c.soft, depth),
                  paddingLeft: 14 + Math.min(depth, 4) * 12,
                  paddingRight: 14,
                },
              ]}
            >
              <Text style={s.filterEmoji}>{habit.emoji}</Text>
              <Text style={[s.filterName, { color: c.text }]}>{habit.name}</Text>
              <Ionicons name={icon} size={23} color={selected ? c.accent : c.muted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SelectionPopover>
  );
}

export function selectionLabel(ids: Set<string>, candidates: Habit[]) {
  if (ids.size === 1) {
    const habit = candidates.find(item => ids.has(item.id));
    return habit ? `${habit.emoji} ${habit.name}` : '1';
  }
  return `${ids.size} ${t('selected')}`;
}
