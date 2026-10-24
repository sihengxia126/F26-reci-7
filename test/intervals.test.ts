import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Safe bounded integers make endpoint arithmetic exact.
const endpoint = fc.integer({ min: -100, max: 100 });
const interval: fc.Arbitrary<Interval> = fc.tuple(endpoint, endpoint)
  .map(([a, b]) => [Math.min(a, b), Math.max(a, b)]);
const intervalList = fc.array(interval, { maxLength: 20 });
const positiveLength = fc.integer({ min: 1, max: 10 });

// Every next start is strictly greater than the preceding end.
const disjointList = fc.tuple(
  endpoint,
  fc.array(fc.tuple(positiveLength, fc.nat(10)), { maxLength: 15 }),
).map(([start, pieces]) => {
  let end = start;
  return pieces.map(([gap, length]): Interval => {
    const nextStart = end + gap;
    end = nextStart + length;
    return [nextStart, end];
  });
});

const covered = (intervals: Interval[], point: number) =>
  intervals.some(([start, end]) => start <= point && point <= end);

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(fc.property(intervalList, xs => {
      const out = mergeIntervals(xs);
      for (const [start, end] of xs) {
        expect(out.some(([a, b]) => a <= start && end <= b)).toBe(true);
      }
    }));
  });

  // Pattern: invariant. Output intervals are valid, sorted, and neither overlap nor touch.
  it('returns canonical interval shapes', () => {
    fc.assert(fc.property(intervalList, xs => {
      const out = mergeIntervals(xs);
      for (let i = 0; i < out.length; i++) {
        expect(Number.isInteger(out[i][0])).toBe(true);
        expect(Number.isInteger(out[i][1])).toBe(true);
        expect(out[i][0]).toBeLessThanOrEqual(out[i][1]);
        if (i > 0) expect(out[i - 1][1]).toBeLessThan(out[i][0]);
      }
    }));
  });

  // Pattern: differential. Input and output cover the same real points.
  it('preserves coverage at endpoints and between endpoints', () => {
    fc.assert(fc.property(intervalList, endpoint, (xs, point) => {
      const out = mergeIntervals(xs);
      const boundaries = [...new Set([...xs.flat(), ...out.flat()])].sort((a, b) => a - b);
      const probes = [point, point + 0.5, ...boundaries];
      // Coverage can only change at a boundary; probe every intervening region.
      for (let i = 1; i < boundaries.length; i++) {
        probes.push((boundaries[i - 1] + boundaries[i]) / 2);
      }
      if (boundaries.length) probes.push(boundaries[0] - 1, boundaries[boundaries.length - 1] + 1);
      for (const p of probes) expect(covered(out, p)).toBe(covered(xs, p));
    }));
  });

  // Pattern: metamorphic. Reordering intervals leaves the merged result unchanged.
  it('ignores input ordering', () => {
    const reordered = intervalList.chain(xs =>
      fc.shuffledSubarray(xs, { minLength: xs.length, maxLength: xs.length })
        .map(shuffled => ({ xs, shuffled })),
    );
    fc.assert(fc.property(reordered, ({ xs, shuffled }) => {
      expect(mergeIntervals(shuffled)).toEqual(mergeIntervals(xs));
    }));
  });

  // Pattern: metamorphic. Duplicating every interval leaves the merged result unchanged.
  it('ignores duplicate intervals', () => {
    fc.assert(fc.property(intervalList, xs => {
      expect(mergeIntervals([...xs, ...xs])).toEqual(mergeIntervals(xs));
    }));
  });

  // Pattern: algebraic. Merging twice is the same as merging once.
  it('is idempotent', () => {
    fc.assert(fc.property(intervalList, xs => {
      const once = mergeIntervals(xs);
      expect(mergeIntervals(once)).toEqual(once);
    }));
  });

  // Pattern: conditional. Already sorted and strictly separated intervals remain unchanged.
  it('preserves already disjoint input', () => {
    fc.assert(fc.property(disjointList, xs => {
      expect(mergeIntervals(xs)).toEqual(xs);
    }));
  });

  // Pattern: conditional. Intervals sharing an endpoint merge into one interval.
  it('merges touching intervals', () => {
    fc.assert(fc.property(endpoint, positiveLength, positiveLength, (start, a, b) => {
      expect(mergeIntervals([[start + a, start + a + b], [start, start + a]]))
        .toEqual([[start, start + a + b]]);
    }));
  });

  // Pattern: conditional. Nested intervals collapse to the outer interval.
  it('keeps the full extent of nested intervals', () => {
    fc.assert(fc.property(endpoint, positiveLength, positiveLength, (start, a, b) => {
      expect(mergeIntervals([[start, start + a + b], [start + a, start + a]]))
        .toEqual([[start, start + a + b]]);
    }));
  });

  // Pattern: invariant. Neither the input list nor its nested intervals are modified.
  it('does not mutate its input', () => {
    fc.assert(fc.property(intervalList, xs => {
      const before = xs.map(([start, end]): Interval => [start, end]);
      mergeIntervals(xs);
      expect(xs).toEqual(before);
    }));
  });
});
