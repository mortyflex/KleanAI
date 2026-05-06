import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { PillButton } from '../../src/components/ui/pill-button';
import { Card } from '../../src/components/ui/card';
import { colors } from '../../src/design/tokens';
import { hasBlockingFlags } from '../../src/utils/safety';
import { useAuth } from '../../src/features/auth';
import { onboardingPersistenceService } from '../../src/features/onboarding/onboarding-persistence.service';

const TOTAL_STEPS = 10;

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 14, color: colors.muted, fontWeight: '600', flex: 1 }}>{label}</Text>
      <Text
        style={{ fontSize: 14, color: colors.ink, fontWeight: '700', flex: 1, textAlign: 'right' }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function SummaryScreen() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const { profile } = useOnboarding();
  const { status, user } = useAuth();
  const { autoSave } = useLocalSearchParams<{ autoSave?: string }>();
  const [saving, setSaving] = useState(false);
  const autoSaveTriggered = useRef(false);

  const isBlocked = hasBlockingFlags(profile.safetyFlags ?? []);

  const goalLabel = profile.goal ? t(`onboarding.summary.goals.${profile.goal}`) : '—';
  const levelLabel = profile.fitnessLevel
    ? t(`onboarding.summary.levels.${profile.fitnessLevel}`)
    : '—';
  const locationLabel = profile.trainingLocation
    ? t(`onboarding.summary.locations.${profile.trainingLocation}`)
    : '—';

  const trainingStr = [
    profile.trainingDaysPerWeek
      ? t('onboarding.summary.daysPerWeek', { days: profile.trainingDaysPerWeek })
      : null,
    profile.sessionDurationMin
      ? t('onboarding.summary.sessionDuration', { min: profile.sessionDurationMin })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const RESTRICTION_KEY_MAP: Record<string, string> = {
    vegetarian: 'vegetarian',
    vegan: 'vegan',
    gluten_free: 'glutenFree',
    lactose_free: 'lactoseFree',
    halal: 'halal',
    kosher: 'kosher',
  };

  const restrictionsLabel =
    profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0
      ? profile.dietaryRestrictions
          .map((r) => t(`onboarding.nutritionPrefs.${RESTRICTION_KEY_MAP[r] ?? r}`))
          .join(', ')
      : t('onboarding.summary.noRestrictions');

  const targetWeightLabel =
    profile.targetWeightKg !== undefined
      ? t('onboarding.summary.weightKgUnit', { kg: profile.targetWeightKg })
      : null;

  const timeframeLabel = profile.targetTimeframe
    ? (() => {
        const weeks = t('onboarding.summary.weeksUnit', {
          weeks: profile.targetTimeframe.durationWeeks,
        });
        const event = profile.targetTimeframe.eventLabel
          ? ` · ${t(`onboarding.summary.events.${profile.targetTimeframe.eventLabel}`)}`
          : '';
        return `${weeks}${event}`;
      })()
    : null;

  const weeklyChangeLabel =
    profile.targetWeightKg !== undefined &&
    profile.weightKg !== undefined &&
    profile.targetTimeframe !== undefined &&
    profile.goal === 'lose_weight' &&
    profile.weightKg > profile.targetWeightKg
      ? t('onboarding.summary.kgPerWeek', {
          kg: ((profile.weightKg - profile.targetWeightKg) / profile.targetTimeframe.durationWeeks).toFixed(
            2
          ),
        })
      : null;

  const safetyStatusLabel = isBlocked
    ? t('onboarding.summary.hasWarnings')
    : t('onboarding.summary.safe');

  const persistAndContinue = async (userId: string) => {
    setSaving(true);
    try {
      await onboardingPersistenceService.saveOnboardingProfile(userId, profile, {
        locale: i18n.language ?? null,
      });
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(
        t('onboarding.gate.saveErrorTitle'),
        (e as Error).message ?? t('onboarding.gate.saveErrorBody')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFollowProgram = () => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !user) {
      // New users always go to dedicated post-onboarding sign-up screen,
      // not login. Returning users sign in via the auth landing screen
      // before starting onboarding, so they should never land here.
      router.push('/(auth)/register?intent=save-onboarding');
      return;
    }
    persistAndContinue(user.id);
  };

  useEffect(() => {
    if (autoSave !== '1') return;
    if (autoSaveTriggered.current) return;
    if (status !== 'authenticated' || !user) return;
    autoSaveTriggered.current = true;
    persistAndContinue(user.id);
    // persistAndContinue is stable enough for this single-shot effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, status, user]);

  const handleEdit = () => {
    router.push('/(onboarding)/goal');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingProgress current={10} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🎉</Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: colors.ink,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {t('onboarding.summary.title')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.muted, textAlign: 'center' }}>
            {t('onboarding.summary.subtitle')}
          </Text>
        </View>

        {isBlocked && (
          <View
            style={{
              padding: 14,
              backgroundColor: '#FFF5F5',
              borderRadius: 12,
              borderLeftWidth: 3,
              borderLeftColor: colors.energy,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.ink }}>
              ⚠️ {t('onboarding.safety.hasFlags')} — {t('onboarding.safety.hasFlagsSub')}
            </Text>
          </View>
        )}

        <Card>
          <View style={{ gap: 0 }}>
            <SummaryRow label={t('onboarding.summary.goal')} value={goalLabel} />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <SummaryRow label={t('onboarding.summary.fitnessLevel')} value={levelLabel} />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <SummaryRow label={t('onboarding.summary.training')} value={trainingStr} />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <SummaryRow label={t('onboarding.summary.location')} value={locationLabel} />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <SummaryRow label={t('onboarding.summary.restrictions')} value={restrictionsLabel} />
            {targetWeightLabel && (
              <>
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <SummaryRow
                  label={t('onboarding.summary.targetWeight')}
                  value={targetWeightLabel}
                />
              </>
            )}
            {timeframeLabel && (
              <>
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <SummaryRow label={t('onboarding.summary.timeframe')} value={timeframeLabel} />
              </>
            )}
            {weeklyChangeLabel && (
              <>
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <SummaryRow
                  label={t('onboarding.summary.weeklyChange')}
                  value={weeklyChangeLabel}
                />
              </>
            )}
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <SummaryRow label={t('onboarding.summary.safetyStatus')} value={safetyStatusLabel} />
          </View>
        </Card>

        <View style={{ marginTop: 32, gap: 12 }}>
          <PillButton
            testID="generate-plan-cta"
            label={
              saving
                ? t('onboarding.gate.saving')
                : t('onboarding.summary.generateCta')
            }
            size="lg"
            onPress={handleFollowProgram}
            disabled={saving || status === 'loading'}
          />
          {saving && (
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator color={colors.brand} />
            </View>
          )}
          <PillButton
            label={t('onboarding.summary.editProfile')}
            size="lg"
            variant="outline"
            onPress={handleEdit}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
