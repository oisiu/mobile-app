import type { Entry, Habit } from '@/domain/types';
import type { useApp } from '@/features/AppProvider';
import type { dark, light } from '@/theme';

export type Palette = typeof light | typeof dark;
export type EditorServices = {
  habits: Habit[];
  repo: ReturnType<typeof useApp>['repo'];
  refresh: () => Promise<void>;
  showSuccess: (message: string) => void;
  c: Palette;
};
export type ExistingEditorProps = EditorServices & { root: Habit; entries: Entry[] };
