import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { PillButton } from '../../src/components/ui/pill-button';
import { colors, radii } from '../../src/design/tokens';
import { Card } from '../../src/components/ui/card';
import {
  runSafetyChecks,
  hasBlockingFlags,
  calorieFloor,
} from '../../src/utils/safety';
import { bmrMifflinStJeor, tdeeFromBMR } from '../../src/utils/calories';
import type { SafetyFlag } from '../../src/types/profile.types';

const TOTAL_STEPS = 7;

function FlagRow({ flag, t }: { flag: SafetyFlag; t: (key: string) => string }) {
  return (
    <View
      testID={`safety-flag-${flag.code}`}
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 14,
        backgroundColor: '#FFF5F5',
        borderRadius: radii.chip,
        borderLeftWidth: 3,
        borderLeftColor: colors.energy,
      }}
    >
      <Text style={{ fontSize: 16 }}>⚠️</Text>
      <Text style={{ flex: 1, fontSize: 14, color: colors.ink, lineHeight: 20 }}>
        {t(flag.i18nKey)}
      </Text>
    </View>
  );
}

export default function SafetyReviewScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const safetyData = useMemo(() => {
    const flags = runSafetyChecks({
      age: profile.age ?? 25,
      gender: profile.gender ?? 'other',
      weightKg: profile.weightKg ?? 70,
      heightCm: profile.heightCm ?? 170,
      targetWeightKg: profile.targetWeightKg,
      trainingDaysPerWeek: profile.trainingDaysPerWeek ?? 3,
      goal: profile.goal ?? 'maintain',
    });

    const bmr = bmrMifflinStJeor(
      profile.weightKg ?? 70,
      profile.heightCm ?? 170,
      profile.age ?? 25,
      profile.gender ?? 'other'
    );
    const tdee = tdeeFromBMR(bmr, profile.trainingDaysPerWeek ?? 3);

    const floor = calorieFloor(profile.gender ?? 'other');
    const isBlocked = hasBlockingFlags(flags);

    return { flags, tdee, floor, isBlocked };
  }, [profile]);

  const handleContinue = () => {
    updateProfile({ safetyFlags: safetyData.flags, isComplete: true });
    router.push('/(onboarding)/summary');
  };

  const handleAdjust = () => {
    router.back();
  };

  const allGood = safetyData.flags.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand }}>
            ← {t('onboarding.back')}
          </Text>
        </Pressable>

        <OnboardingProgress current={6} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 28 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 8 }}>
            {t('onboarding.safety.title')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.muted }}>
            {t('onboarding.safety.subtitle')}
          </Text>
        </View>

        {/* TDEE card */}
        <Card style={{ marginBottom: 20 }}>
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '600' }}>
                {t('onboarding.safety.tdee')}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                {safetyData.tdee} {t('onboarding.safety.kcalUnit')}
              </Text>
            </View>
            <View
              style={{ height: 1, backgroundColor: colors.border }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.muted, fontWeight: '600' }}>
                {t('onboarding.safety.estimatedCalories')}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: safetyData.isBlocked ? colors.energy : colors.mint,
                }}
                testID="estimated-calories"
              >
                ≥ {safetyData.floor} {t('onboarding.safety.kcalUnit')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Safety status */}
        {allGood ? (
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
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.mint }}>
              {t('onboarding.safety.allGood')}
            </Text>
            <Text style={{ fontSize: 14, color: colors.ink }}>
              {t('onboarding.safety.allGoodSub')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.energy }}>
              {t('onboarding.safety.hasFlags')}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 4 }}>
              {t('onboarding.safety.hasFlagsSub')}
            </Text>
            {safetyData.flags.map((flag) => (
              <FlagRow key={flag.code} flag={flag} t={t} />
            ))}
          </View>
        )}

        <View style={{ marginTop: 32, gap: 12 }}>
          {safetyData.isBlocked ? (
            <>
              <PillButton
                label={t('onboarding.safety.adjustProfile')}
                size="lg"
                onPress={handleAdjust}
              />
              <PillButton
                label={t('onboarding.safety.continueAnyway')}
                size="lg"
                variant="outline"
                onPress={handleContinue}
              />
            </>
          ) : (
            <PillButton
              label={t('onboarding.next')}
              size="lg"
              onPress={handleContinue}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
