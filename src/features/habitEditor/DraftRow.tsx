import type { HabitType } from '@/domain/types';
import { CalendarThresholdInput } from '@/features/CalendarThresholdInput';
import { View } from 'react-native';
import { ChildRowActions } from './ChildActions';
import { HabitInputs } from './EditorFields';
import type { DraftNode } from './draftTree';
import { s } from './editorStyles';
import type { Palette } from './editorTypes';

type DraftRowProps = {
  type: HabitType;
  node: DraftNode;
  depth: number;
  siblingIndex: number;
  siblingCount: number;
  c: Palette;
  onChange: (key: string, patch: Partial<Pick<DraftNode, 'name' | 'emoji' | 'color' | 'calendarThreshold'>>) => void;
  onAdd: (key: string) => void;
  onRemove: (node: DraftNode) => void;
  onReorder: (key: string, direction: -1 | 1) => void;
};

const MAX_INDENT_LEVELS = 4;
const INDENT = 14;

/** One editable sub-habit with its own sub-habits nested beneath it. */
export function DraftRow({
  node,
  depth,
  siblingIndex,
  siblingCount,
  c,
  type,
  onChange,
  onAdd,
  onRemove,
  onReorder,
}: DraftRowProps) {
  // Rows nest inside their parent's view, so each level adds one step until the cap.
  const indent = (Math.min(depth, MAX_INDENT_LEVELS) - Math.min(Math.max(0, depth - 1), MAX_INDENT_LEVELS)) * INDENT;
  return (
    <View style={{ marginLeft: indent }}>
      <View style={[s.childCard, depth > 0 && { borderLeftWidth: 2, borderLeftColor: c.line, paddingLeft: 10 }]}>
        <HabitInputs
          name={node.name}
          emoji={node.emoji}
          color={node.color ?? null}
          onName={name => onChange(node.key, { name })}
          onEmoji={emoji => onChange(node.key, { emoji })}
          onColor={color => onChange(node.key, { color })}
          c={c}
        />
        <CalendarThresholdInput
          key={type}
          type={type}
          value={node.calendarThreshold}
          onChange={calendarThreshold => onChange(node.key, { calendarThreshold })}
          c={c}
          name={node.name}
        />
        <ChildRowActions
          name={node.name}
          siblingIndex={siblingIndex}
          siblingCount={siblingCount}
          onAdd={() => onAdd(node.key)}
          onReorder={direction => onReorder(node.key, direction)}
          onRemove={() => onRemove(node)}
          c={c}
        />
      </View>
      {node.children.map((child, index) => (
        <DraftRow
          type={type}
          key={child.key}
          node={child}
          depth={depth + 1}
          siblingIndex={index}
          siblingCount={node.children.length}
          c={c}
          onChange={onChange}
          onAdd={onAdd}
          onRemove={onRemove}
          onReorder={onReorder}
        />
      ))}
    </View>
  );
}
