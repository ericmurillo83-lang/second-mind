import {
  computeStats,
  formatGlucose,
  groupByDay,
  latestReading,
  mgdlToMmol,
  mmolToMgdl,
  parseGlucoseInput,
  rangeStatus,
  readingsInLastDays,
  readingsInLastHours,
  roundPercentages,
  toDisplayValue,
  validateGlucoseEntry,
  validateTargetRange,
} from './glucose';
import type { GlucoseReading } from './types';

const reading = (valueMgdl: number, takenAt: string, id = takenAt): GlucoseReading => ({
  id,
  createdAt: takenAt,
  updatedAt: takenAt,
  valueMgdl,
  takenAt,
  context: 'other',
  source: 'manual',
});

describe('unit conversion', () => {
  it('converts mg/dL and mmol/L symmetrically', () => {
    expect(mgdlToMmol(180.156)).toBeCloseTo(10, 2);
    expect(mmolToMgdl(5.5)).toBeCloseTo(99.09, 1);
    expect(mmolToMgdl(mgdlToMmol(123))).toBeCloseTo(123, 6);
  });

  it('formats for display in each unit', () => {
    expect(formatGlucose(112.4, 'mg/dL')).toBe('112');
    expect(formatGlucose(112, 'mmol/L')).toBe('6.2');
    expect(formatGlucose(90, 'mmol/L')).toBe('5.0');
    expect(toDisplayValue(99.5, 'mg/dL')).toBe(100);
  });

  it('parses input in the selected unit', () => {
    expect(parseGlucoseInput('110', 'mg/dL')).toBe(110);
    expect(parseGlucoseInput(' 6,1 ', 'mmol/L')).toBeCloseTo(109.9, 1);
    expect(parseGlucoseInput('abc', 'mg/dL')).toBeNull();
    expect(parseGlucoseInput('-5', 'mg/dL')).toBeNull();
    expect(parseGlucoseInput('1e3', 'mg/dL')).toBeNull();
  });
});

describe('validateGlucoseEntry', () => {
  it('accepts plausible values', () => {
    expect(validateGlucoseEntry('105', 'mg/dL')).toEqual({ ok: true, mgdl: 105 });
  });
  it('rejects empty, non-numeric and implausible values with a message', () => {
    expect(validateGlucoseEntry('', 'mg/dL').ok).toBe(false);
    expect(validateGlucoseEntry('12a', 'mg/dL').ok).toBe(false);
    const tooHigh = validateGlucoseEntry('6000', 'mg/dL');
    expect(tooHigh.ok).toBe(false);
    if (!tooHigh.ok) expect(tooHigh.message).toMatch(/between 20 and 600/);
    expect(validateGlucoseEntry('0.5', 'mmol/L').ok).toBe(false);
  });
});

describe('rangeStatus', () => {
  it('treats the bounds as in range', () => {
    expect(rangeStatus(70, 70, 180)).toBe('in');
    expect(rangeStatus(180, 70, 180)).toBe('in');
    expect(rangeStatus(69, 70, 180)).toBe('below');
    expect(rangeStatus(181, 70, 180)).toBe('above');
  });
});

describe('computeStats', () => {
  it('returns empty stats for no readings', () => {
    const s = computeStats([], 70, 180);
    expect(s.count).toBe(0);
    expect(s.averageMgdl).toBeNull();
    expect(s.pctIn).toBe(0);
  });

  it('computes averages, extremes and range counts', () => {
    const s = computeStats(
      [reading(60, 'a'), reading(100, 'b'), reading(150, 'c'), reading(250, 'd')],
      70,
      180,
    );
    expect(s.count).toBe(4);
    expect(s.averageMgdl).toBe(140);
    expect(s.minMgdl).toBe(60);
    expect(s.maxMgdl).toBe(250);
    expect([s.below, s.inRange, s.above]).toEqual([1, 2, 1]);
    expect([s.pctBelow, s.pctIn, s.pctAbove]).toEqual([25, 50, 25]);
  });

  it('keeps percentages summing to 100', () => {
    const s = computeStats([reading(60, 'a'), reading(100, 'b'), reading(250, 'c')], 70, 180);
    expect(s.pctBelow + s.pctIn + s.pctAbove).toBe(100);
  });
});

describe('roundPercentages', () => {
  it('uses largest remainder', () => {
    expect(roundPercentages([1, 1, 1], 3)).toEqual([34, 33, 33]);
    expect(roundPercentages([0, 0], 0)).toEqual([0, 0]);
  });
});

describe('time windows and grouping', () => {
  const now = new Date(2026, 9, 24, 12, 0);
  const r = [
    reading(100, new Date(2026, 9, 24, 8, 0).toISOString(), 'today'),
    reading(110, new Date(2026, 9, 23, 22, 0).toISOString(), 'yesterday'),
    reading(120, new Date(2026, 9, 17, 9, 0).toISOString(), 'week-ago'),
    reading(130, new Date(2026, 9, 24, 13, 0).toISOString(), 'future'),
  ];

  it('filters to the last N calendar days, excluding the future', () => {
    expect(readingsInLastDays(r, 1, now).map((x) => x.id)).toEqual(['today']);
    expect(readingsInLastDays(r, 7, now).map((x) => x.id)).toEqual(['today', 'yesterday']);
    expect(readingsInLastDays(r, 8, now).map((x) => x.id)).toEqual(['today', 'yesterday', 'week-ago']);
  });

  it('filters to a trailing hour window', () => {
    expect(readingsInLastHours(r, 24, now).map((x) => x.id).sort()).toEqual(['today', 'yesterday']);
  });

  it('finds the latest reading', () => {
    expect(latestReading(r)?.id).toBe('future');
    expect(latestReading([])).toBeUndefined();
  });

  it('groups by local day, newest first', () => {
    const groups = groupByDay(r.slice(0, 3), (x) => x.takenAt);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-10-24', '2026-10-23', '2026-10-17']);
  });
});

describe('validateTargetRange', () => {
  it('requires a sensible, ordered range', () => {
    expect(validateTargetRange(70, 180).ok).toBe(true);
    expect(validateTargetRange(150, 160).ok).toBe(false);
    expect(validateTargetRange(30, 180).ok).toBe(false);
    expect(validateTargetRange(70, 450).ok).toBe(false);
  });
});
