import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { WeekSlider } from '../../src/features/onboarding/components/WeekSlider';
import { PillButton } from '../../src/components/ui/pill-button';
import { KleanText } from '../../src/components/ui/klean-text';
import { colors, radii } from '../../src/design/tokens';
import type { EventLabel } from '../../src/types/profile.types';
import { recommendedWeeksFor } from '../../src/utils/timeframe';
import { classifyGoal } from '../../src/utils/goal-classification';

const TOTAL_STEPS = 10;

const EVENT_LABELS: { value: EventLabel; labelKey: string }[] = [
  { value: 'wedding', labelKey: 'onboarding.timeframe.eventWedding' },
  { value: 'vacation', labelKey: 'onboarding.timeframe.eventVacation' },
  { value: 'competition', labelKey: 'onboarding.timeframe.eventCompetition' },
  { value: 'other', labelKey: 'onboarding.timeframe.eventOther' },
];

export default function TimeframeScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const recommended = useMemo(
    () =>
      recommendedWeeksFor({
        goal: profile.goal ?? 'maintain',
        weightKg: profile.weightKg ?? 70,
        targetWeightKg: profile.targetWeightKg,
      }),
    [profile.goal, profile.weightKg, profile.targetWeightKg]
  );

  const [weeks, setWeeks] = useState<number>(
    profile.targetTimeframe?.durationWeeks ?? recommended
  );
  const [eventLabel, setEventLabel] = useState<EventLabel | undefined>(
    profile.targetTimeframe?.eventLabel
  );

  const previewKind = useMemo(() => {
    if (
      !profile.goal ||
      profile.weightKg === undefined ||
      profile.age === undefined ||
      !profile.gender ||
      profile.heightCm === undefined
    ) {
      return undefined;
    }
    return classifyGoal({
      goal: profile.goal,
      age: profile.age,
      gender: profile.gender,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      targetWeightKg: profile.targetWeightKg,
      targetTimeframeWeeks: weeks,
      trainingDaysPerWeek: profile.trainingDaysPerWeek ?? 3,
    }).kind;
  }, [profile, weeks]);

  const hint = useMemo(() => {
    if (profile.targetWeightKg === undefined) {
      return { text: t('onboarding.timeframe.noTargetHint'), color: colors.muted };
    }
    if (previewKind === 'inconsistent') {
      return {
        text: t('onboarding.timeframe.recommendedHint', { weeks: recommended }),
        color: colors.muted,
      };
    }
    if (previewKind === 'unsafe') {
      return { text: t('onboarding.timeframe.shorterUnsafeHint'), color: colors.energy };
    }
    if (previewKind === 'ambitious') {
      return { text: t('onboarding.timeframe.shorterAmbitiousHint'), color: colors.amber };
    }
    if (weeks > recommended + 2) {
      return { text: t('onboarding.timeframe.longerHint'), color: colors.muted };
    }
    if (Math.abs(weeks - recommended) <= 1) {
      return { text: t('onboarding.timeframe.matchHint'), color: colors.mint };
    }
    return {
      text: t('onboarding.timeframe.recommendedHint', { weeks: recommended }),
      color: colors.muted,
    };
  }, [t, weeks, recommended, previewKind, profile.targetWeightKg]);

  const onSubmit = () => {
    updateProfile({
      targetTimeframe: {
        durationWeeks: weeks,
        eventLabel,
      },
    });
    router.push('/(onboarding)/safety-review');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={{ marginBottom: 24 }}>
            <KleanText variant="label" color={colors.brand}>
              ← {t('onboarding.back')}
            </KleanText>
          </Pressable>

          <OnboardingProgress current={8} total={TOTAL_STEPS} />

          <View style={{ marginTop: 32, marginBottom: 24 }}>
            <KleanText variant="h1" color={colors.ink} style={{ marginBottom: 8 }}>
              {t('onboarding.timeframe.title')}
            </KleanText>
            <KleanText variant="secondary" color={colors.muted}>
              {t('onboarding.timeframe.subtitle')}
            </KleanText>
          </View>

          {/* Recommended hint */}
          <View
            testID="timeframe-recommended-hint"
            style={{
              padding: 14,
              borderRadius: radii.card,
              backgroundColor: colors.card,
              borderWidth: 1.5,
              borderColor: colors.border,
              marginBottom: 18,
            }}
          >
            <KleanText variant="label" color={hint.color}>
              {hint.text}
            </KleanText>
          </View>

          <WeekSlider
            testID="timeframe-week-slider"
            value={weeks}
            onChange={setWeeks}
            recommended={recommended}
          />

          {/* Event label */}
          <View style={{ marginTop: 28 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}
            >
              <KleanText variant="caption" color={colors.muted} weight="700">
                {t('onboarding.timeframe.eventTitle')}
              </KleanText>
              <KleanText variant="caption" color={colors.muted}>
                {t('onboarding.timeframe.eventOptional')}
              </KleanText>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {EVENT_LABELS.map((e) => {
                const isActive = eventLabel === e.value;
                return (
                  <Pressable
                    key={e.value}
                    testID={`event-${e.value}`}
                    onPress={() =>
                      setEventLabel((prev) => (prev === e.value ? undefined : e.value))
                    }
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: radii.pill,
                      backgroundColor: isActive ? colors.brandLight : colors.card,
                      borderWidth: 1.5,
                      borderColor: isActive ? colors.brand : colors.border,
                    }}
                  >
                    <KleanText
                      variant="label"
                      color={isActive ? colors.brand : colors.ink}
                      weight="700"
                    >
                      {t(e.labelKey)}
                    </KleanText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ marginTop: 32 }}>
            <PillButton
              label={t('onboarding.next')}
              size="lg"
              onPress={onSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
