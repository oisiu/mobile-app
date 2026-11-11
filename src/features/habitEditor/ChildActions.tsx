import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import type { Palette } from './editorTypes';

/** Adds a sub-habit: a full-width button for the habit being edited, a compact one on each row. */
export function AddChildButton({
  onAdd,
  c,
  parentName,
}: {
  onAdd: () => void;
  c: Palette;
  /** Set on rows; the button then adds inside that sub-habit. */
  parentName?: string;
}) {
  const nested = parentName !== undefined;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={nested ? `${t('addLevel')} ${parentName.trim() || t('newCategory')}` : t('addChild')}
      onPress={onAdd}
      style={{
        minHeight: 44,
        paddingHorizontal: nested ? 10 : 14,
        borderRadius: 12,
        backgroundColor: nested ? 'transparent' : c.soft,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: nested ? 'flex-start' : 'center',
        gap: 6,
      }}
    >
      <Ionicons name="add" size={18} color={c.accent} accessible={false} />
      <Text style={{ color: c.accent, fontSize: nested ? 13 : 15, fontWeight: '600' }}>
        {t(nested ? 'newChildHabit' : 'addChild')}
      </Text>
    </TouchableOpacity>
  );
}

type RowActionsProps = {
  name: string;
  siblingIndex: number;
  siblingCount: number;
  onAdd: () => void;
  onReorder: (direction: -1 | 1) => void;
  onRemove: () => void;
  c: Palette;
};

/** One line of direct actions under a sub-habit: add inside, move up/down, delete. */
export function ChildRowActions({ name, siblingIndex, siblingCount, onAdd, onReorder, onRemove, c }: RowActionsProps) {
  const label = name.trim() || t('newCategory');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <AddChildButton onAdd={onAdd} c={c} parentName={name} />
      <View style={{ flex: 1 }} />
      {siblingCount > 1 &&
        ([-1, 1] as const).map(direction => {
          const disabled = direction === -1 ? siblingIndex === 0 : siblingIndex === siblingCount - 1;
          return (
            <TouchableOpacity
              key={direction}
              accessibilityRole="button"
              accessibilityLabel={`${t(direction === -1 ? 'moveUp' : 'moveDown')} ${label}`}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => {
                if (!disabled) onReorder(direction);
              }}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.3 : 1,
              }}
            >
              <Ionicons
                name={direction === -1 ? 'arrow-up' : 'arrow-down'}
                size={18}
                color={c.accent}
                accessible={false}
              />
            </TouchableOpacity>
          );
        })}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${t('delete')} ${name}`}
        onPress={onRemove}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="trash-outline" size={18} color={c.danger} accessible={false} />
      </TouchableOpacity>
    </View>
  );
}
