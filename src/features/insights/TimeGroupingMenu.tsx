import type { BucketSize } from '@/domain/analytics';
import type { PopoverAnchor } from '@/features/AnchoredPopover';
import { SelectionPopover } from '@/features/SelectionPopover';
import { t } from '@/i18n';
import { Text } from '@/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { s, type Palette } from './detailStyles';

const timelineLimits: Record<BucketSize, { initial: number; step: number; max: number }> = {
  day: { initial: 60, step: 60, max: 36500 },
  week: { initial: 26, step: 12, max: 5200 },
  month: { initial: 36, step: 12, max: 1200 },
  quarter: { initial: 24, step: 12, max: 400 },
  year: { initial: 12, step: 12, max: 100 },
};
export const initialTimelineCount = (scale: BucketSize) => timelineLimits[scale].initial;
export const extendTimelineCount = (scale: BucketSize, count: number) => {
  const { step, max } = timelineLimits[scale];
  return Math.min(count + step, max);
};

type Props = {
  scale: BucketSize;
  label: string;
  onChoose: (scale: BucketSize) => void;
  c: Palette;
  pill?: boolean;
};
export function TimeGroupingMenu({ scale, label, onChoose, c, pill = false }: Props) {
  const [open, setOpen] = useState(false),
    [anchor, setAnchor] = useState<PopoverAnchor | null>(null);
  const trigger = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const openMenu = () => {
    if (trigger.current) {
      trigger.current.measureInWindow((x, y, width, height) => {
        setAnchor({ x, y, width, height });
        setOpen(true);
      });
    } else setOpen(true);
  };
  const choose = (value: BucketSize) => {
    onChoose(value);
    setOpen(false);
  };

  return (
    <View>
      <TouchableOpacity
        ref={trigger}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={openMenu}
        style={
          pill
            ? [s.filterButton, { backgroundColor: c.soft, maxWidth: undefined, alignSelf: 'flex-start' }]
            : { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }
        }
      >
        <Ionicons name="calendar-outline" size={16} color={c.accent} accessible={false} />
        <Text style={pill ? [s.filterButtonText, { color: c.accent }] : { color: c.accent, fontWeight: '700' }}>
          {t(scale)}
        </Text>
        {!pill && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.accent} />}
      </TouchableOpacity>
      {open && (
        <SelectionPopover anchor={anchor} visible onClose={() => setOpen(false)} title={label} c={c}>
          <ScrollView>
            <View accessibilityRole="radiogroup" accessibilityLabel={label}>
              {(['day', 'week', 'month', 'quarter', 'year'] as const).map(value => (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={t(value)}
                  accessibilityState={{ selected: scale === value }}
                  onPress={() => choose(value)}
                  style={[s.filterRow, { borderColor: c.line, paddingHorizontal: 14 }]}
                >
                  <Text style={[s.filterName, { color: c.text }]}>{t(value)}</Text>
                  <Ionicons
                    name={scale === value ? 'radio-button-on' : 'radio-button-off'}
                    size={23}
                    color={scale === value ? c.accent : c.muted}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SelectionPopover>
      )}
    </View>
  );
}
