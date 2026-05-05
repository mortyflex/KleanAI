import React, { useMemo } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card } from '../../src/components/ui/card';
import { PillButton } from '../../src/components/ui/pill-button';
import { KleanText } from '../../src/components/ui/klean-text';
import { colors, radii } from '../../src/design/tokens';
import { smoothEvent } from '../../src/features/smoothing';
import { useSmoothingContext } from '../../src/features/smoothing/hooks/useSmoothingContext';
import type {
  SmoothingEvent,
  SmoothingResult,
  WorkoutSmoothingAction,
} from '../../src/types/smoothing.types';

function buildEventFromParams(params: Record<string, string | string[] | undefined>): SmoothingEvent | { type: string } | null {
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  if (!rawType) return null;

  const excessKcalRaw = Array.isArray(params.excessKcal) ? params.excessKcal[0] : params.excessKcal;
  const excessKcal = excessKcalRaw !== undefined ? Number(excessKcalRaw) : undefined;

  const weekDayIndexRaw = Array.isArray(params.weekDayIndex) ? params.weekDayIndex[0] : params.weekDayIndex;
  const weekDayIndex = weekDayIndexRaw !== undefined ? Number(weekDayIndexRaw) : undefined;

  const availableMinutesRaw = Array.isArray(params.availableMinutes) ? params.availableMinutes[0] : params.availableMinutes;
  const availableMinutes = availableMinutesRaw !== undefined ? Number(availableMinutesRaw) : undefined;

  return { type: rawType, excessKcal, weekDayIndex, availableMinutes } as SmoothingEvent | { type: string };
}

export default function SmoothingFeedbackScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    excessKcal?: string;
    weekDayIndex?: string;
    availableMinutes?: string;
  }>();

  const context = useSmoothingContext();
  const result = useMemo<SmoothingResult>(() => {
    const event = buildEventFromParams(params);
    return smoothEvent(event, context);
  }, [params, context]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-start', marginBottom: 4 }}>
        <KleanText variant="label" color={colors.brand}>
          ‹ {t('smoothing.feedback.back')}
        </KleanText>
      </Pressable>

      <View
        testID="smoothing-zero-guilt-banner"
        style={{
          alignSelf: 'flex-start',
          backgroundColor: colors.mintLight,
          borderRadius: radii.pill,
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        <KleanText variant="caption" color={colors.mint}>
          {t('smoothing.feedback.zeroGuiltBanner')}
        </KleanText>
      </View>

      <View style={{ gap: 6 }}>
        <KleanText variant="h1" color={colors.ink}>
          {t('smoothing.feedback.title')}
        </KleanText>
        <KleanText variant="secondary" color={colors.muted}>
          {t('smoothing.feedback.subtitle')}
        </KleanText>
      </View>

      {result.ok === false ? (
        <UnknownEventCard messageKey={result.messageKey} />
      ) : result.category === 'nutrition' ? (
        <NutritionResultView result={result} />
      ) : (
        <WorkoutResultView result={result} />
      )}

      <PillButton
        label={t('smoothing.feedback.primaryCta')}
        size="lg"
        variant="filled"
        onPress={() => router.back()}
      />
    </ScrollView>
  );
}

function UnknownEventCard({ messageKey }: { messageKey: string }) {
  const { t } = useTranslation('common');
  return (
    <Card style={{ gap: 8 }}>
      <KleanText variant="h3" color={colors.ink}>
        {t('smoothing.feedback.unknownEvent.title')}
      </KleanText>
      <KleanText variant="secondary" color={colors.muted}>
        {t(messageKey)}
      </KleanText>
    </Card>
  );
}

function NutritionResultView({
  result,
}: {
  result: Extract<SmoothingResult, { category: 'nutrition' }>;
}) {
  const { t } = useTranslation('common');
  const perDayKcal = result.adjustments.length > 0
    ? Math.abs(result.adjustments[0].kcalDelta)
    : 0;

  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 8 }}>
        <KleanText variant="h3" color={colors.ink}>
          {t(`smoothing.events.${result.eventType}.title`)}
        </KleanText>
        <KleanText variant="secondary" color={colors.ink}>
          {t(result.messageKey)}
        </KleanText>
        <KleanText variant="caption" color={colors.muted}>
          {t(result.recommendationKey)}
        </KleanText>
      </Card>

      {result.adjustments.length > 0 && (
        <Card style={{ gap: 10 }}>
          <KleanText variant="label" color={colors.muted}>
            {t('smoothing.feedback.spreadInfo', { count: result.spreadDays })}
          </KleanText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <KleanText variant="bodyMedium" color={colors.ink}>
              {t('smoothing.feedback.compensatedKcal', { kcal: result.totalCompensatedKcal })}
            </KleanText>
            <KleanText variant="caption" color={colors.muted}>
              {t('smoothing.feedback.perDayKcal', { kcal: perDayKcal })}
            </KleanText>
          </View>
        </Card>
      )}

      {result.hitFloor && (
        <Card
          testID="smoothing-floor-card"
          style={{ gap: 6, backgroundColor: colors.amberLight }}
        >
          <KleanText variant="label" color={colors.amber}>
            {t('smoothing.feedback.floorReachedTitle')}
          </KleanText>
          <KleanText variant="secondary" color={colors.ink}>
            {t('smoothing.feedback.floorReachedBody')}
          </KleanText>
          {result.unaddressedKcal > 0 && (
            <KleanText variant="caption" color={colors.muted}>
              {t('smoothing.feedback.unaddressedKcal', { kcal: result.unaddressedKcal })}
            </KleanText>
          )}
        </Card>
      )}
    </View>
  );
}

function WorkoutResultView({
  result,
}: {
  result: Extract<SmoothingResult, { category: 'workout' }>;
}) {
  const { t } = useTranslation('common');
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 8 }}>
        <KleanText variant="h3" color={colors.ink}>
          {t(`smoothing.events.${result.eventType}.title`)}
        </KleanText>
        <KleanText variant="secondary" color={colors.ink}>
          {t(result.messageKey)}
        </KleanText>
        <KleanText variant="caption" color={colors.muted}>
          {t(result.recommendationKey)}
        </KleanText>
      </Card>

      <KleanText variant="label" color={colors.muted}>
        {t('smoothing.feedback.actionsTitle')}
      </KleanText>

      <View style={{ gap: 10 }}>
        {result.actions.map((action, idx) => (
          <ActionCard key={`${action.type}-${idx}`} action={action} />
        ))}
      </View>
    </View>
  );
}

function ActionCard({ action }: { action: WorkoutSmoothingAction }) {
  const { t } = useTranslation('common');
  return (
    <Card testID={`smoothing-action-${action.type}`} style={{ gap: 4 }}>
      <KleanText variant="bodyMedium" color={colors.ink}>
        {t(action.labelKey)}
      </KleanText>
      <KleanText variant="caption" color={colors.muted}>
        {t(action.descriptionKey, { min: action.durationMin ?? 0 })}
      </KleanText>
    </Card>
  );
}
