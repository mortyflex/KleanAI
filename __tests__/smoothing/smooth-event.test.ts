import { smoothEvent, isSmoothingEventType } from '../../src/features/smoothing/utils/smooth-event';
import { EVENT_COPY, UNKNOWN_EVENT_MESSAGE_KEY } from '../../src/features/smoothing/utils/messages';
import { SMOOTHING_EVENT_TYPES } from '../../src/types/smoothing.types';
import { CALORIE_FLOOR_FEMALE } from '../../src/utils/safety';

const CTX = { gender: 'female' as const, dailyKcalTarget: 1800 };

describe('isSmoothingEventType', () => {
  it('accepts every documented event type', () => {
    for (const t of SMOOTHING_EVENT_TYPES) {
      expect(isSmoothingEventType(t)).toBe(true);
    }
  });

  it('rejects unknown strings', () => {
    expect(isSmoothingEventType('exploded_workout')).toBe(false);
    expect(isSmoothingEventType('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isSmoothingEventType(42)).toBe(false);
    expect(isSmoothingEventType(null)).toBe(false);
    expect(isSmoothingEventType(undefined)).toBe(false);
    expect(isSmoothingEventType({})).toBe(false);
  });
});

describe('smoothEvent — routing', () => {
  it('routes nutrition events to the nutrition smoother', () => {
    const result = smoothEvent({ type: 'excess_food', excessKcal: 300 }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.category).toBe('nutrition');
  });

  it('routes workout events to the workout smoother', () => {
    const result = smoothEvent({ type: 'missed_workout' }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.category).toBe('workout');
  });

  it('every documented event type has a copy mapping', () => {
    for (const t of SMOOTHING_EVENT_TYPES) {
      expect(EVENT_COPY[t]).toBeDefined();
      expect(EVENT_COPY[t].messageKey).toMatch(/^smoothing\.events\./);
      expect(EVENT_COPY[t].recommendationKey).toMatch(/^smoothing\.events\./);
    }
  });
});

describe('smoothEvent — invalid / unknown events', () => {
  it('returns a soft error for an unknown event type string', () => {
    const result = smoothEvent({ type: 'gym_burned_down' as never }, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unknown_event_type');
      expect(result.messageKey).toBe(UNKNOWN_EVENT_MESSAGE_KEY);
    }
  });

  it('returns a soft error for null/undefined input', () => {
    expect(smoothEvent(null, CTX).ok).toBe(false);
    expect(smoothEvent(undefined, CTX).ok).toBe(false);
  });

  it('returns invalid_event when a nutrition event is missing excessKcal', () => {
    const result = smoothEvent({ type: 'excess_food' } as never, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_event');
  });

  it('returns invalid_event when excessKcal is not a number', () => {
    const result = smoothEvent({ type: 'alcohol', excessKcal: 'lots' } as never, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_event');
  });

  it('returns invalid_event when excessKcal is NaN', () => {
    const result = smoothEvent({ type: 'ordered_food', excessKcal: Number.NaN } as never, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_event');
  });

  it('the unknown event message key never points outside smoothing.feedback.unknownEvent', () => {
    expect(UNKNOWN_EVENT_MESSAGE_KEY).toBe('smoothing.feedback.unknownEvent.message');
  });
});

describe('smoothEvent — calories never below the safety floor', () => {
  it('any nutrition event respects the floor regardless of excess', () => {
    const ctx = { gender: 'female' as const, dailyKcalTarget: 1300 };
    for (const type of ['excess_food', 'ordered_food', 'alcohol'] as const) {
      const result = smoothEvent({ type, excessKcal: 1500 }, ctx);
      expect(result.ok).toBe(true);
      if (result.ok && result.category === 'nutrition') {
        for (const adj of result.adjustments) {
          expect(adj.adjustedDailyTarget).toBeGreaterThanOrEqual(CALORIE_FLOOR_FEMALE);
        }
      }
    }
  });

  it('skipped_meal never produces a compensating cut', () => {
    const result = smoothEvent({ type: 'skipped_meal', missedKcal: 500 } as never, CTX);
    expect(result.ok).toBe(true);
    if (result.ok && result.category === 'nutrition') {
      expect(result.adjustments).toEqual([]);
      expect(result.totalCompensatedKcal).toBe(0);
    }
  });
});
