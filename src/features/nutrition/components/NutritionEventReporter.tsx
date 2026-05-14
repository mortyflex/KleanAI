import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { colors, radii } from '../../../design/tokens';
import type { SmoothingContext } from '../../../types/smoothing.types';
import { useNutritionEventReporter } from '../hooks/useNutritionEventReporter';
import {
  isAcknowledgedResult,
  type NutritionEventType,
} from '../utils/nutrition-events';

interface NutritionEventReporterProps {
  context: SmoothingContext;
  testID?: string;
}

const EVENTS: { type: NutritionEventType; emoji: string }[] = [
  { type: 'followed_plan', emoji: '✅' },
  { type: 'excess_food', emoji: '🍰' },
  { type: 'skipped_meal', emoji: '⏭️' },
  { type: 'ordered_food', emoji: '🥡' },
  { type: 'alcohol', emoji: '🍷' },
];

/**
 * Five one-tap buttons that let the user report how today went. Successful
 * events are routed to the smoothing engine via {@link useNutritionEventReporter}
 * which both computes a local zero-guilt result AND queues the event for sync.
 *
 * For `followed_plan` we acknowledge in-place — no smoothing, no sync — and
 * show a positive line to reinforce the streak without being preachy.
 */
export function NutritionEventReporter({
  context,
  testID,
}: NutritionEventReporterProps) {
  const { t } = useTranslation('common');
  const { report, lastResult, isReporting } = useNutritionEventReporter(context);
  const [activeType, setActiveType] = useState<NutritionEventType | null>(null);

  const onPress = (type: NutritionEventType) => {
    setActiveType(type);
    report({ type }).catch(() => {
      // Errors are surfaced via the sync logger; the local result is still set.
    });
  };

  return (
    <Card style={{ gap: 14 }} testID={testID ?? 'nutrition-events'}>
      <View style={{ gap: 4 }}>
        <KleanText variant="h3" color={colors.ink}>
          {t('nutrition.events.title')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {t('nutrition.events.subtitle')}
        </KleanText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {EVENTS.map(({ type, emoji }) => {
          const active = activeType === type;
          return (
            <Pressable
              key={type}
              testID={`event-${type}`}
              accessibilityRole="button"
              accessibilityLabel={t(`nutrition.events.${type}.label`)}
              onPress={() => onPress(type)}
              disabled={isReporting}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: radii.pill,
                backgroundColor: active ? colors.ink : colors.bg,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <KleanText variant="label">{emoji}</KleanText>
              <KleanText
                variant="label"
                color={active ? '#FFFFFF' : colors.ink}
              >
                {t(`nutrition.events.${type}.label`)}
              </KleanText>
            </Pressable>
          );
        })}
      </View>

      {lastResult && (
        <View
          testID="event-feedback"
          style={{
            backgroundColor: colors.mintLight,
            borderRadius: radii.chip,
            padding: 12,
            gap: 4,
          }}
        >
          <KleanText variant="caption" color={colors.mint} weight="700">
            {t('smoothing.feedback.zeroGuiltBanner')}
          </KleanText>
          <KleanText variant="body" color={colors.ink}>
            {feedbackMessage(lastResult, activeType, t)}
          </KleanText>
        </View>
      )}
    </Card>
  );
}

type TFn = (key: string, opts?: Record<string, unknown>) => string;

function feedbackMessage(
  result: ReturnType<typeof useNutritionEventReporter>['lastResult'],
  activeType: NutritionEventType | null,
  t: TFn,
): string {
  if (!result) return '';
  if (isAcknowledgedResult(result)) {
    return t(result.messageKey);
  }
  if (!result.ok) {
    return t(result.messageKey);
  }
  // Smoothing result — read the engine-provided messageKey first, then fall
  // back to our event-specific copy.
  if (activeType) {
    return t(`nutrition.events.${activeType}.message`);
  }
  return t(result.messageKey);
}
