import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { PillButton } from '../../src/components/ui/pill-button';
import { KleanText } from '../../src/components/ui/klean-text';
import { colors, radii } from '../../src/design/tokens';
import { Card } from '../../src/components/ui/card';
import { hasBlockingFlags, calorieFloor } from '../../src/utils/safety';
import { classifyGoal } from '../../src/utils/goal-classification';
import { suggestSaferAlternatives } from '../../src/utils/timeframe';
import type { GoalClassificationKind, SafetyFlag } from '../../src/types/profile.types';

const TOTAL_STEPS = 10;

function FlagRow({ flag, t }: { flag: SafetyFlag; t: (key: string) => string }) {
  return (
    <View
      testID={`safety-flag-${flag.code}`}
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 14,
        backgroundColor: colors.energyLight,
        borderRadius: radii.chip,
        borderLeftWidth: 3,
        borderLeftColor: colors.energy,
      }}
    >
      <KleanText variant="bodyLarge">⚠️</KleanText>
      <KleanText variant="label" color={colors.ink} style={{ flex: 1 }}>
        {t(flag.i18nKey)}
      </KleanText>
    </View>
  );
}

const WEIGHT_FLAGS = new Set(['WEIGHT_LOSS_TOO_FAST', 'DEFICIT_TOO_HIGH', 'CALORIES_TOO_LOW']);

export default function SafetyReviewScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const data = useMemo(() => {
    const targetTimeframeWeeks = profile.targetTimeframe?.durationWeeks;
    const supportedGoals = ['lose_weight', 'gain_muscle', 'maintain', 'recomposition'] as const;
    const goal = supportedGoals.includes(profile.goal as (typeof supportedGoals)[number])
      ? (profile.goal as (typeof supportedGoals)[number])
      : 'maintain';

    const result = classifyGoal({
      goal,
      age: profile.age ?? 25,
      gender: profile.gender ?? 'other',
      weightKg: profile.weightKg ?? 70,
      heightCm: profile.heightCm ?? 170,
      targetWeightKg: profile.targetWeightKg,
      targetTimeframeWeeks,
      trainingDaysPerWeek: profile.trainingDaysPerWeek ?? 3,
    });

    const floor = calorieFloor(profile.gender ?? 'other');

    const showAlternative =
      result.kind === 'unsafe' &&
      goal === 'lose_weight' &&
      profile.targetWeightKg !== undefined &&
      (profile.weightKg ?? 0) > profile.targetWeightKg &&
      result.flags.some((f) => WEIGHT_FLAGS.has(f.code));

    const alternative = showAlternative
      ? suggestSaferAlternatives({
          weightKg: profile.weightKg!,
          targetWeightKg: profile.targetWeightKg!,
          targetTimeframeWeeks,
        })
      : null;

    return {
      result,
      floor,
      alternative,
    };
  }, [profile]);

  const kind: GoalClassificationKind = data.result.kind;
  const isBlocked = hasBlockingFlags(data.result.flags);

  const handleContinueWithMyGoal = () => {
    updateProfile({
      safetyFlags: data.result.flags,
      ambitionAccepted: kind === 'ambitious',
      isComplete: true,
    });
    router.push('/(onboarding)/summary');
  };

  const handleFollowKlean = () => {
    if (data.alternative) {
      updateProfile({
        targetTimeframe: {
          durationWeeks: data.alternative.saferWeeks,
          eventLabel: profile.targetTimeframe?.eventLabel,
        },
      });
    }
    router.back();
  };

  const handleEditGoal = () => {
    router.push('/(onboarding)/goal');
  };

  const handleAdjust = () => {
    router.back();
  };

  const titleKey =
    kind === 'unsafe'
      ? 'onboarding.safety.kinds.unsafeTitle'
      : kind === 'ambitious'
        ? 'onboarding.safety.kinds.ambitiousTitle'
        : kind === 'inconsistent'
          ? 'onboarding.safety.kinds.inconsistentTitle'
          : 'onboarding.safety.kinds.validTitle';

  const subKey =
    kind === 'unsafe'
      ? 'onboarding.safety.kinds.unsafeSub'
      : kind === 'ambitious'
        ? 'onboarding.safety.kinds.ambitiousSub'
        : kind === 'inconsistent'
          ? 'onboarding.safety.kinds.inconsistentSub'
          : 'onboarding.safety.kinds.validSub';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={{ marginBottom: 24 }}>
          <KleanText variant="label" color={colors.brand}>
            ← {t('onboarding.back')}
          </KleanText>
        </Pressable>

        <OnboardingProgress current={9} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 28 }}>
          <KleanText variant="h1" color={colors.ink} style={{ marginBottom: 8 }} testID="safety-kind-title">
            {t(titleKey)}
          </KleanText>
          <KleanText variant="secondary" color={colors.muted}>
            {t(subKey)}
          </KleanText>
        </View>

        {/* Calorie preview card */}
        <Card style={{ marginBottom: 20 }} testID="calorie-preview">
          <View style={{ gap: 14 }}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <KleanText variant="caption" color={colors.muted} weight="700">
                {t('onboarding.safety.tdee')}
              </KleanText>
              <KleanText variant="bodyMedium" color={colors.ink} weight="800">
                {data.result.estimatedDailyCalories ?? '—'} {t('onboarding.safety.kcalUnit')}
              </KleanText>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <KleanText variant="caption" color={colors.muted} weight="700">
                {t('onboarding.safety.estimatedCalories')}
              </KleanText>
              <KleanText
                variant="bodyMedium"
                color={isBlocked ? colors.energy : colors.mint}
                weight="800"
                testID="estimated-calories"
              >
                {data.result.estimatedDailyCalories
                  ? `${Math.max(data.result.estimatedDailyCalories, data.floor)} ${t('onboarding.safety.kcalUnit')}`
                  : `≥ ${data.floor} ${t('onboarding.safety.kcalUnit')}`}
              </KleanText>
            </View>
          </View>
        </Card>

        {kind === 'valid' && (
          <View
            testID="safety-all-good"
            style={{
              padding: 20,
              backgroundColor: colors.mintLight,
              borderRadius: radii.card,
              borderWidth: 1.5,
              borderColor: colors.mint,
              gap: 6,
            }}
          >
            <KleanText variant="bodyMedium" color={colors.mint} weight="700">
              {t('onboarding.safety.allGood')}
            </KleanText>
            <KleanText variant="label" color={colors.ink}>
              {t('onboarding.safety.allGoodSub')}
            </KleanText>
          </View>
        )}

        {data.result.flags.length > 0 && (
          <View style={{ gap: 12 }}>
            <KleanText variant="bodyMedium" color={colors.energy} weight="700">
              {t('onboarding.safety.hasFlags')}
            </KleanText>
            <KleanText variant="label" color={colors.muted}>
              {t('onboarding.safety.hasFlagsSub')}
            </KleanText>
            {data.result.flags.map((flag) => (
              <FlagRow key={flag.code} flag={flag} t={t} />
            ))}
          </View>
        )}

        {data.alternative && (
          <View
            testID="safety-alternative"
            style={{
              marginTop: 20,
              padding: 18,
              backgroundColor: colors.amberLight,
              borderRadius: radii.card,
              borderWidth: 1.5,
              borderColor: colors.amber,
              gap: 10,
            }}
          >
            <KleanText variant="label" color={colors.ink} weight="800">
              💡 {t('onboarding.safety.alternatives.title')}
            </KleanText>
            <KleanText variant="label" color={colors.ink}>
              {t('onboarding.safety.alternatives.saferWeeks', {
                weeks: data.alternative.saferWeeks,
              })}
            </KleanText>
            <KleanText variant="caption" color={colors.muted}>
              {t('onboarding.safety.alternatives.saferWeeklyLoss', {
                kg: data.alternative.saferWeeklyLossKg,
              })}
            </KleanText>
            {data.alternative.suggestKickstart && (
              <KleanText variant="caption" color={colors.ink}>
                🚀 {t('onboarding.safety.alternatives.kickstart')}
              </KleanText>
            )}
            {data.alternative.partialProgressPossible && (
              <View style={{ gap: 2 }}>
                <KleanText variant="caption" color={colors.ink}>
                  🎯{' '}
                  {t('onboarding.safety.alternatives.partialProgress', {
                    kg: data.alternative.partialKgBeforeEvent,
                  })}
                </KleanText>
                <KleanText variant="caption" color={colors.muted} style={{ paddingLeft: 18 }}>
                  {t('onboarding.safety.alternatives.continueAfter')}
                </KleanText>
              </View>
            )}
          </View>
        )}

        <View style={{ marginTop: 32, gap: 12 }}>
          {kind === 'valid' && (
            <PillButton
              testID="safety-cta-primary"
              label={t('onboarding.next')}
              size="lg"
              onPress={handleContinueWithMyGoal}
            />
          )}
          {kind === 'ambitious' && (
            <>
              <PillButton
                testID="safety-cta-follow-klean"
                label={t('onboarding.safety.kinds.ambitiousFollowKlean')}
                size="lg"
                onPress={handleFollowKlean}
              />
              <PillButton
                testID="safety-cta-continue-mine"
                label={t('onboarding.safety.kinds.ambitiousContinueMine')}
                size="lg"
                variant="outline"
                onPress={handleContinueWithMyGoal}
              />
            </>
          )}
          {kind === 'unsafe' && (
            <>
              <PillButton
                testID="safety-cta-follow-klean"
                label={t('onboarding.safety.kinds.unsafeFollowKlean')}
                size="lg"
                onPress={handleFollowKlean}
              />
              <PillButton
                testID="safety-cta-edit-goal"
                label={t('onboarding.safety.kinds.unsafeEdit')}
                size="lg"
                variant="outline"
                onPress={handleAdjust}
              />
            </>
          )}
          {kind === 'inconsistent' && (
            <PillButton
              testID="safety-cta-fix-goal"
              label={t('onboarding.safety.kinds.inconsistentEdit')}
              size="lg"
              onPress={handleEditGoal}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
