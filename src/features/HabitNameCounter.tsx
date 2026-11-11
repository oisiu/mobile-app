import { habitNameLimit } from '@/domain/habitName';
import { t } from '@/i18n';
import { dark, light } from '@/theme';
import { Text } from '@/theme/Typography';

// The counter only appears once the limit is close, so short names stay uncluttered.
const WARNING_MARGIN = 5;

export function HabitNameCounter({ name, c }: { name: string; c: typeof light | typeof dark }) {
  const count = Array.from(name.trim()).length;
  if (count < habitNameLimit - WARNING_MARGIN) return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('habitNameCount', { count, limit: habitNameLimit })}
      style={{ color: count > habitNameLimit ? c.danger : c.muted, fontSize: 12, textAlign: 'right', marginTop: 4 }}
    >
      {count}/{habitNameLimit}
    </Text>
  );
}
