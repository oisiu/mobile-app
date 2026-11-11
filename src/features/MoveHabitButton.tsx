import { canMoveHabit, moveDestinations, moveSummary } from '@/domain/moveDestinations';
import type { Habit } from '@/domain/types';
import { useApp } from '@/features/AppProvider';
import { useHabitMutation } from '@/features/useHabitMutation';
import { t } from '@/i18n';
import { Text, TextInput } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AnchoredPopover, openPopover, type PopoverAnchor } from './AnchoredPopover';

const TOP_LEVEL = '__top_level__';
// Appends after the destination's existing sub-habits; the repository clamps the position.
const LAST_POSITION = Number.MAX_SAFE_INTEGER;
const SEARCH_THRESHOLD = 7;

const pathOf = (habits: Habit[], habit: Habit): string => {
  const names = [habit.name];
  let parentId = habit.parentId;
  while (parentId) {
    const parent = habits.find(item => item.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
  }
  return names.join(' / ');
};

/** Header action that moves a habit, with its sub-habits and history, under another habit or to the top level. */
export function MoveHabitButton({ habit }: { habit: Habit }) {
  const { habits, entries, repo, refresh, showSuccess, palette: c } = useApp();
  const mutation = useHabitMutation(refresh);
  const [anchor, setAnchor] = useState<PopoverAnchor | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const destinations = useMemo(() => (open ? moveDestinations(habits, habit.id) : []), [open, habits, habit.id]);
  const summary = useMemo(
    () => (open ? moveSummary(habits, entries, habit.id) : { habits: 0, records: 0 }),
    [open, habits, entries, habit.id],
  );
  if (!canMoveHabit(habits, habit.id)) return null;

  const canGoTopLevel = habit.parentId !== null;
  const needle = query.trim().toLocaleLowerCase();
  const matches = destinations.filter(item => item.path.toLocaleLowerCase().includes(needle));
  const chosen = destinations.find(item => item.habit.id === selected);
  const title = `${habit.emoji} ${habit.name}`.trim();
  const newPath = selected === TOP_LEVEL ? habit.name : chosen ? `${chosen.path} / ${habit.name}` : null;
  const empty = !canGoTopLevel && !destinations.length;

  const close = () => {
    if (mutation.pending.current) return;
    setOpen(false);
    setSelected(null);
    setQuery('');
  };

  const move = async () => {
    if (!repo || !selected || mutation.pending.current) return;
    const parentId = selected === TOP_LEVEL ? null : selected;
    const destination = selected === TOP_LEVEL ? t('topLevel') : (chosen?.habit.name ?? '');
    try {
      await mutation.run(
        () => repo.move(habit.id, parentId, LAST_POSITION),
        () => {
          setOpen(false);
          setSelected(null);
          setQuery('');
          showSuccess(t('habitMoved', { name: title, destination }));
        },
      );
    } catch (error) {
      Alert.alert(t('couldNotSave'), error instanceof Error ? error.message : String(error));
    }
  };

  const option = (id: string, label: string, detail?: string) => {
    const active = selected === id;
    return (
      <TouchableOpacity
        key={id}
        accessibilityRole="radio"
        accessibilityLabel={detail ?? label}
        accessibilityState={{ selected: active, disabled: mutation.busy }}
        disabled={mutation.busy}
        onPress={() => setSelected(id)}
        style={[s.option, { backgroundColor: active ? c.soft : c.card, borderColor: active ? c.accent : c.line }]}
      >
        <Ionicons
          name={active ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={active ? c.accent : c.muted}
          accessible={false}
        />
        <View style={{ flex: 1 }}>
          <Text style={[s.optionName, { color: c.text }]}>{label}</Text>
          {detail?.includes(' / ') && <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{detail}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('moveHabitTo', { name: habit.name })}
        onPress={event =>
          openPopover(event, next => {
            setAnchor(next);
            setOpen(true);
          })
        }
        style={({ pressed }) => [s.trigger, { backgroundColor: pressed ? c.soft : 'transparent' }]}
      >
        {({ pressed }) => <Ionicons name="enter-outline" size={18} color={pressed ? c.text : c.muted} />}
      </Pressable>
      {open && (
        <AnchoredPopover visible onClose={close} anchor={anchor} c={c} maxWidth={390} maxHeight={620}>
          <View style={{ flexShrink: 1 }}>
            <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>
              {t('moveHabitTitle', { name: title })}
            </Text>
            {destinations.length >= SEARCH_THRESHOLD && (
              <TextInput
                accessibilityLabel={t('searchHabits')}
                placeholder={t('searchHabits')}
                placeholderTextColor={c.muted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                style={[s.search, { backgroundColor: c.card, color: c.text, borderColor: c.line }]}
              />
            )}
            <ScrollView
              accessibilityRole="radiogroup"
              accessibilityLabel={t('moveHabitTitle', { name: title })}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.list}
            >
              {canGoTopLevel && !needle && option(TOP_LEVEL, t('topLevel'))}
              {matches.map(item => option(item.habit.id, `${item.habit.emoji} ${item.habit.name}`.trim(), item.path))}
              {(empty || (!!needle && !matches.length)) && (
                <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>
                  {t(empty ? 'noMoveDestinations' : 'noMatchingHabits')}
                </Text>
              )}
            </ScrollView>
            {newPath && (
              <View accessibilityLiveRegion="polite" style={[s.preview, { backgroundColor: c.card }]}>
                <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>
                  {pathOf(habits, habit)} → {newPath}
                </Text>
                <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>
                  {t('moveSummary', { habits: summary.habits, records: summary.records })}
                </Text>
              </View>
            )}
            <View style={s.actions}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={mutation.busy}
                onPress={close}
                style={[s.action, { borderColor: c.line, borderWidth: 1 }]}
              >
                <Text style={{ color: c.text, fontSize: 16 }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('moveConfirm')}
                accessibilityState={{ disabled: !selected || mutation.busy, busy: mutation.busy }}
                disabled={!selected || mutation.busy}
                onPress={move}
                style={[s.action, { backgroundColor: c.accent, opacity: selected && !mutation.busy ? 1 : 0.45 }]}
              >
                <Text style={{ color: c.onAccent, fontSize: 16, fontWeight: '700' }}>{t('moveConfirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnchoredPopover>
      )}
    </>
  );
}

const s = StyleSheet.create({
  trigger: { width: 44, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  search: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginBottom: 10, fontSize: 16 },
  list: { gap: 8, paddingBottom: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionName: { fontSize: 16, fontWeight: '600' },
  preview: { padding: 12, borderRadius: 12, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
