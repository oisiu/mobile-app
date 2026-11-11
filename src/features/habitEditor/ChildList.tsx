import type { HabitType } from '@/domain/types';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import type { Dispatch, SetStateAction } from 'react';
import { AddChildButton } from './ChildActions';
import { DraftRow } from './DraftRow';
import { changeNode, reorderNode, type DraftNode } from './draftTree';
import { s } from './editorStyles';
import type { Palette } from './editorTypes';

type Props = {
  type: HabitType;
  nodes: DraftNode[];
  setNodes: Dispatch<SetStateAction<DraftNode[]>>;
  /** Adds a blank sub-habit under `parentKey`, or under the habit being edited when omitted. */
  onAdd: (parentKey?: string) => void;
  onRemove: (node: DraftNode) => void;
  c: Palette;
};

/** The sub-habits section shared by the new and existing habit editors. */
export function ChildList({ type, nodes, setNodes, onAdd, onRemove, c }: Props) {
  return (
    <>
      <Text style={[s.label, { color: c.muted, marginTop: 30 }]}>{t('children')}</Text>
      <AddChildButton onAdd={() => onAdd()} c={c} />
      {nodes.map((node, index) => (
        <DraftRow
          type={type}
          key={node.key}
          node={node}
          depth={0}
          siblingIndex={index}
          siblingCount={nodes.length}
          c={c}
          onChange={(key, patch) => setNodes(current => changeNode(current, key, patch))}
          onAdd={onAdd}
          onRemove={onRemove}
          onReorder={(key, direction) => setNodes(current => reorderNode(current, key, direction))}
        />
      ))}
    </>
  );
}
