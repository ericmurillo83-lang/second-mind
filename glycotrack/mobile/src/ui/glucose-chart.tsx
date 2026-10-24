import { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { DAY, HOUR, weekdayShort } from '@/domain/dates';
import { formatGlucose, rangeStatus } from '@/domain/glucose';
import type { GlucoseReading, GlucoseUnit } from '@/domain/types';

import { useRangeColors } from './status';
import { useTheme } from './theme-context';

export interface GlucoseChartProps {
  readings: readonly GlucoseReading[];
  from: Date;
  to: Date;
  lowMgdl: number;
  highMgdl: number;
  unit: GlucoseUnit;
  height?: number;
  /** Sparkline mode: no axes or labels. */
  compact?: boolean;
  /** Text alternative describing what the chart shows. Required for screen readers. */
  accessibilityLabel: string;
  testID?: string;
}

const PAD = { left: 38, right: 10, top: 12, bottom: 24 };
/** SVG text doesn't inherit the page font on web; native uses the system font by default. */
const LABEL_FONT = Platform.OS === 'web' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : undefined;
const PAD_COMPACT = { left: 4, right: 4, top: 6, bottom: 6 };

/**
 * Scatter + line chart of manual readings over time with the user's target band.
 * Purely a visualization of logged values; it does not predict or alert.
 */
export function GlucoseChart({
  readings,
  from,
  to,
  lowMgdl,
  highMgdl,
  unit,
  height = 200,
  compact,
  accessibilityLabel,
  testID,
}: GlucoseChartProps) {
  const { colors } = useTheme();
  const rc = useRangeColors();
  const [width, setWidth] = useState(0);
  const pad = compact ? PAD_COMPACT : PAD;

  const geometry = useMemo(() => {
    if (width <= 0) return null;
    const values = readings.map((r) => r.valueMgdl);
    const yMin = Math.min(40, ...values.map((v) => v - 10));
    const yMax = Math.max(compact ? 260 : 300, ...values.map((v) => v + 15));
    const t0 = from.getTime();
    const t1 = Math.max(to.getTime(), t0 + 1);
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const x = (t: number) => pad.left + ((t - t0) / (t1 - t0)) * innerW;
    const y = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
    const sorted = [...readings].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    const points = sorted.map((r) => ({
      id: r.id,
      cx: x(new Date(r.takenAt).getTime()),
      cy: y(r.valueMgdl),
      status: rangeStatus(r.valueMgdl, lowMgdl, highMgdl),
    }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ');

    // X-axis ticks: every 6 hours for a day window, otherwise evenly spaced days.
    const span = t1 - t0;
    const ticks: { x: number; label: string }[] = [];
    if (!compact) {
      if (span <= DAY + HOUR) {
        const start = new Date(t0);
        start.setMinutes(0, 0, 0);
        start.setHours(Math.ceil(start.getHours() / 6) * 6);
        for (let t = start.getTime(); t <= t1; t += 6 * HOUR) {
          const h = new Date(t).getHours();
          ticks.push({ x: x(t), label: h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p` });
        }
      } else {
        const days = Math.round(span / DAY);
        const every = days <= 7 ? 1 : days <= 14 ? 2 : 5;
        const first = new Date(t0);
        first.setHours(12, 0, 0, 0);
        for (let i = 0, t = first.getTime(); t <= t1; i++, t += DAY) {
          if (i % every !== 0) continue;
          const d = new Date(t);
          ticks.push({ x: x(t), label: days <= 7 ? weekdayShort(d) : `${d.getMonth() + 1}/${d.getDate()}` });
        }
      }
    }
    // Connecting lines help read a single day; across many days they become noise.
    const showLine = span <= DAY + HOUR;
    return { x, y, points, path, ticks, yMax, innerW, showLine };
  }, [width, readings, from, to, lowMgdl, highMgdl, compact, height, pad]);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height, width: '100%' }}>
      {geometry ? (
        <Svg width={width} height={height}>
          {/* Target band */}
          <Rect
            x={pad.left}
            y={geometry.y(highMgdl)}
            width={geometry.innerW}
            height={Math.max(0, geometry.y(lowMgdl) - geometry.y(highMgdl))}
            fill={colors.targetBand}
            rx={4}
          />
          {[lowMgdl, highMgdl].map((v) => (
            <G key={v}>
              <Line
                x1={pad.left}
                x2={width - pad.right}
                y1={geometry.y(v)}
                y2={geometry.y(v)}
                stroke={colors.inRange}
                strokeOpacity={0.55}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              {!compact && (
                <SvgText
                  x={pad.left - 6}
                  y={geometry.y(v) + 4}
                  fontSize={11}
                  fill={colors.textSecondary}
                  textAnchor="end"
                  fontFamily={LABEL_FONT}
                  fontWeight="600">
                  {formatGlucose(v, unit)}
                </SvgText>
              )}
            </G>
          ))}
          {!compact &&
            geometry.ticks.map((t) => (
              <G key={`${t.x}-${t.label}`}>
                <Line
                  x1={t.x}
                  x2={t.x}
                  y1={pad.top}
                  y2={height - pad.bottom}
                  stroke={colors.chartGrid}
                  strokeWidth={1}
                />
                <SvgText x={t.x} y={height - 6} fontSize={11} fill={colors.textTertiary} textAnchor="middle" fontFamily={LABEL_FONT}>
                  {t.label}
                </SvgText>
              </G>
            ))}
          {geometry.showLine && geometry.points.length > 1 && (
            <Path d={geometry.path} stroke={colors.chartLine} strokeOpacity={0.45} strokeWidth={compact ? 1.5 : 2} fill="none" strokeLinejoin="round" />
          )}
          {geometry.points.map((p) => (
            <Circle
              key={p.id}
              cx={p.cx}
              cy={p.cy}
              r={compact ? 2.6 : 4}
              fill={rc[p.status].fg}
              stroke={colors.surface}
              strokeWidth={compact ? 1 : 1.5}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
