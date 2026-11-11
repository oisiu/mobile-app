import { t } from '@/i18n';
import { View } from 'react-native';
import { ChartHeader } from './DetailControls';
import { skeleton, type Palette } from './detailStyles';
export function DeferredCardSkeleton({ c, chart }: { c: Palette; chart: 'history' | 'bestStreaks' | 'frequency' }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t(chart)}
      accessibilityState={{ busy: true }}
      style={[skeleton.skeletonCard, { backgroundColor: c.card }]}
    >
      <ChartHeader chart={chart} label="" onFilter={() => undefined} c={c} loading />
      <View style={{ marginTop: 20, height: 140, overflow: 'hidden' }}>
        {chart === 'bestStreaks' ? (
          <View style={{ gap: 12 }}>
            {[90, 72, 58, 44, 32].map(width => (
              <View key={width} style={{ width: `${width}%`, height: 18, borderRadius: 6, backgroundColor: c.soft }} />
            ))}
          </View>
        ) : chart === 'frequency' ? (
          <View style={{ gap: 6 }}>
            {Array.from({ length: 7 }, (_, row) => (
              <View key={row} style={{ flexDirection: 'row', gap: 16 }}>
                {Array.from({ length: 8 }, (_, column) => {
                  const size = 8 + ((row + column) % 3) * 3;
                  return (
                    <View
                      key={column}
                      style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.soft }} />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <>
            {[0, 1, 2, 3].map(line => (
              <View key={line} style={[skeleton.skeletonLine, { backgroundColor: c.line, top: line * 40 }]} />
            ))}
            <View style={{ height: 130, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 4 }}>
              {[40, 70, 52, 95, 64, 110, 82, 58, 100, 76, 120, 90].map((height, index) => (
                <View key={index} style={{ flex: 1, height, borderRadius: 4, backgroundColor: c.soft }} />
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export function CalendarSkeleton({ c }: { c: Palette }) {
  return (
    <View
      accessibilityRole="progressbar"
      importantForAccessibility="no-hide-descendants"
      style={skeleton.calendarSkeleton}
    >
      <View style={skeleton.calendarSkeletonWeekdays}>
        {Array.from({ length: 7 }, (_, index) => (
          <View key={index} style={[skeleton.calendarSkeletonWeekday, { backgroundColor: c.soft }]} />
        ))}
      </View>
      <View style={skeleton.calendarSkeletonViewport}>
        <View style={skeleton.calendarSkeletonWeeks}>
          {Array.from({ length: 12 }, (_, week) => (
            <View key={week} style={skeleton.calendarSkeletonWeek}>
              <View style={skeleton.calendarSkeletonMonthSpace}>
                {week % 4 === 0 && <View style={[skeleton.calendarSkeletonMonth, { backgroundColor: c.soft }]} />}
              </View>
              <View style={skeleton.calendarSkeletonDays}>
                {Array.from({ length: 7 }, (_, day) => (
                  <View
                    key={day}
                    style={[
                      skeleton.calendarSkeletonDay,
                      { backgroundColor: (week + day) % 6 === 0 ? c.line : c.soft },
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
