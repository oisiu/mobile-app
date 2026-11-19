import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { s } from './editorStyles';
import type { Palette } from './editorTypes';

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
      style={[s.iconButton, !nested && { backgroundColor: c.soft }]}
    >
      <Ionicons name={nested ? 'add-circle-outline' : 'add'} size={20} color={c.accent} accessible={false} />
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
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <AddChildButton onAdd={onAdd} c={c} parentName={name} />
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
              style={[s.iconButton, { opacity: disabled ? 0.3 : 1 }]}
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
        accessibilityLabel={`${t('delete')} ${label}`}
        onPress={onRemove}
        style={s.iconButton}
      >
        <Ionicons name="trash-outline" size={18} color={c.danger} accessible={false} />
      </TouchableOpacity>
    </View>
  );
}
