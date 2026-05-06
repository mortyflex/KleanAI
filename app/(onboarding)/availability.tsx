import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { PillButton } from '../../src/components/ui/pill-button';
import { KleanText } from '../../src/components/ui/klean-text';
import { colors, radii } from '../../src/design/tokens';
import type {
  DayOfWeek,
  TimeSlot,
  WeeklyAvailability,
} from '../../src/types/profile.types';

const TOTAL_STEPS = 10;
const DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
const SLOTS: TimeSlot[] = ['morning', 'midday', 'evening'];

function emptyAvailability(): WeeklyAvailability {
  return { slots: {} };
}

function toggleSlot(
  state: WeeklyAvailability,
  day: DayOfWeek,
  slot: TimeSlot
): WeeklyAvailability {
  const current = state.slots[day] ?? [];
  const next = current.includes(slot)
    ? current.filter((s) => s !== slot)
    : [...current, slot];
  const slots = { ...state.slots };
  if (next.length === 0) {
    delete slots[day];
  } else {
    slots[day] = next;
  }
  return { slots };
}

export default function AvailabilityScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const [availability, setAvailability] = useState<WeeklyAvailability>(
    profile.weeklyAvailability ?? emptyAvailability()
  );

  const summary = useMemo(() => {
    const dayCount = Object.keys(availability.slots).length;
    const slotCount = Object.values(availability.slots).reduce(
      (sum, arr) => sum + (arr?.length ?? 0),
      0
    );
    return { dayCount, slotCount };
  }, [availability]);

  const canContinue = summary.slotCount > 0;

  const onContinue = () => {
    if (!canContinue) return;
    updateProfile({
      weeklyAvailability: availability,
      trainingDaysPerWeek: Math.max(1, summary.dayCount),
    });
    router.push('/(onboarding)/location');
  };

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

        <OnboardingProgress current={5} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 24 }}>
          <KleanText variant="h1" color={colors.ink} style={{ marginBottom: 8 }}>
            {t('onboarding.availability.title')}
          </KleanText>
          <KleanText variant="secondary" color={colors.muted}>
            {t('onboarding.availability.subtitle')}
          </KleanText>
        </View>

        {/* Header row — slot labels */}
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
            marginBottom: 8,
            paddingLeft: 56,
          }}
        >
          {SLOTS.map((slot) => (
            <View
              key={slot}
              style={{ flex: 1, alignItems: 'center' }}
              testID={`availability-slot-header-${slot}`}
            >
              <KleanText variant="caption" color={colors.muted} weight="700">
                {t(`onboarding.availability.${slot}`)}
              </KleanText>
            </View>
          ))}
        </View>

        {/* Grid */}
        <View style={{ gap: 6 }} testID="availability-grid">
          {DAYS.map((day) => (
            <View
              key={day}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <View style={{ width: 50, alignItems: 'flex-start' }}>
                <KleanText variant="label" color={colors.ink} weight="700">
                  {t(`onboarding.availability.days.${day}`)}
                </KleanText>
              </View>
              {SLOTS.map((slot) => {
                const isOn = availability.slots[day]?.includes(slot) ?? false;
                return (
                  <Pressable
                    key={`${day}-${slot}`}
                    testID={`availability-cell-${day}-${slot}`}
                    onPress={() =>
                      setAvailability((prev) => toggleSlot(prev, day, slot))
                    }
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: radii.chip,
                      backgroundColor: isOn ? colors.brand : colors.card,
                      borderWidth: 1.5,
                      borderColor: isOn ? colors.brand : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <KleanText
                      variant="bodyMedium"
                      color={isOn ? '#FFFFFF' : colors.muted}
                      weight="700"
                    >
                      {isOn ? '✓' : '·'}
                    </KleanText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Summary */}
        <View
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: radii.card,
            backgroundColor: colors.card,
            borderWidth: 1.5,
            borderColor: colors.border,
            gap: 4,
          }}
          testID="availability-summary"
        >
          <KleanText variant="bodyMedium" color={colors.ink} weight="700">
            {t('onboarding.availability.selectedDays', { count: summary.dayCount })}
          </KleanText>
          <KleanText variant="caption" color={colors.muted}>
            {t('onboarding.availability.selectedSlots', { count: summary.slotCount })}
          </KleanText>
          <KleanText variant="caption" color={colors.muted} style={{ marginTop: 6 }}>
            {t('onboarding.availability.tip')}
          </KleanText>
          {!canContinue && (
            <KleanText
              variant="caption"
              color={colors.energy}
              testID="availability-min-warning"
              style={{ marginTop: 6 }}
            >
              {t('onboarding.availability.minOneRequired')}
            </KleanText>
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <PillButton
            label={t('onboarding.next')}
            size="lg"
            disabled={!canContinue}
            onPress={onContinue}
            style={{ opacity: canContinue ? 1 : 0.4 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
