import { useCallback, useState } from 'react';
import type {
  SmoothingContext,
  SmoothingResult,
} from '../../../types/smoothing.types';
import { useSmoothingLogger } from '../../smoothing';
import {
  buildSmoothingEvent,
  isAcknowledgedResult,
  reportNutritionEvent,
  type NutritionEventResult,
  type NutritionEventType,
  type ReportNutritionEventInput,
} from '../utils/nutrition-events';

export interface UseNutritionEventReporterResult {
  lastResult: NutritionEventResult | null;
  isReporting: boolean;
  /**
   * Report a nutrition event. For `followed_plan` we return an acknowledged
   * result with positive copy and DO NOT log to the smoothing queue —
   * staying on plan is not an "incident" to be smoothed.
   *
   * For every other event we run it through the smoothing engine and
   * persist via the standard {@link useSmoothingLogger} so the offline
   * queue / sync metadata stays consistent with workout events.
   */
  report: (input: ReportNutritionEventInput) => Promise<NutritionEventResult>;
}

export function useNutritionEventReporter(
  context: SmoothingContext,
): UseNutritionEventReporterResult {
  const { logEvent } = useSmoothingLogger();
  const [lastResult, setLastResult] = useState<NutritionEventResult | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  const report = useCallback(
    async (input: ReportNutritionEventInput) => {
      setIsReporting(true);
      try {
        const result = reportNutritionEvent(input, context);
        setLastResult(result);

        if (
          input.type === 'followed_plan'
          || isAcknowledgedResult(result)
          || !result.ok
        ) {
          return result;
        }

        const event = buildSmoothingEvent(input);
        if (event) {
          // Fire-and-forget: the logger handles its own retry/state. We do
          // NOT block the UI on it — the smoothing decision is already
          // computed locally and the user gets feedback immediately.
          await logEvent(event, result as SmoothingResult);
        }

        return result;
      } finally {
        setIsReporting(false);
      }
    },
    [context, logEvent],
  );

  return { lastResult, isReporting, report };
}

export type { NutritionEventType, NutritionEventResult, ReportNutritionEventInput };
