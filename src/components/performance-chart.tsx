import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPerformanceValue } from '@/lib/format';
import type { DisciplineUnit, Performance } from '@/lib/types';

const CHART_HEIGHT = 180;
const PADDING = { top: 24, bottom: 16, left: 8, right: 8 };

type PerformanceChartProps = {
  /** Chronologisch sortiert (älteste zuerst), alle mit derselben Disziplin. */
  performances: Performance[];
  unit: DisciplineUnit;
  lowerIsBetter: boolean;
};

/**
 * Einfaches Verlaufsdiagramm: x = Zeit, y = Leistungswert.
 * Wettkampf-Leistungen sind farbig, Trainingsleistungen grau,
 * die Bestleistung ist hervorgehoben.
 */
export function PerformanceChart({ performances, unit, lowerIsBetter }: PerformanceChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  if (performances.length < 2) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
        Ab zwei Einträgen siehst du hier deinen Verlauf.
      </ThemedText>
    );
  }

  const values = performances.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const bestValue = lowerIsBetter ? minValue : maxValue;

  const times = performances.map((p) => new Date(p.performed_on).getTime());
  const minTime = Math.min(...times);
  const timeRange = Math.max(...times) - minTime || 1;

  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const points = performances.map((p, i) => ({
    x: PADDING.left + ((times[i] - minTime) / timeRange) * innerWidth,
    // Hoher Wert oben — bei Zeiten ist "unten" also besser, ehrlich geplottet
    y: PADDING.top + (1 - (p.value - minValue) / valueRange) * innerHeight,
    performance: p,
  }));

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.container}>
      {width > 0 && (
        <Svg width={width} height={CHART_HEIGHT}>
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={theme.backgroundSelected}
            strokeWidth={2}
          />
          {points.map((point) => {
            const isBest = point.performance.value === bestValue;
            const isCompetition = point.performance.context === 'competition';
            return (
              <Circle
                key={point.performance.id}
                cx={point.x}
                cy={point.y}
                r={isBest ? 6 : 4}
                fill={isCompetition ? theme.tint : theme.textSecondary}
                stroke={isBest ? theme.tint : 'none'}
                strokeWidth={isBest ? 2 : 0}
              />
            );
          })}
          {/* Bestleistung beschriften */}
          {points
            .filter((p) => p.performance.value === bestValue)
            .slice(0, 1)
            .map((point) => (
              <SvgText
                key="best-label"
                x={Math.min(Math.max(point.x, 30), width - 30)}
                y={point.y < CHART_HEIGHT / 2 ? point.y + 20 : point.y - 12}
                fontSize={12}
                fontWeight="bold"
                fill={theme.tint}
                textAnchor="middle">
                {formatPerformanceValue(bestValue, unit)}
              </SvgText>
            ))}
        </Svg>
      )}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.tint }]} />
          <ThemedText type="small" themeColor="textSecondary">
            Wettkampf
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.textSecondary }]} />
          <ThemedText type="small" themeColor="textSecondary">
            Training
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: Spacing.one,
  },
  hint: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
