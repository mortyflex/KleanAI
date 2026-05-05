import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { TrainingSchema, type TrainingFormData } from '../../src/features/onboarding/schemas';
import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { OptionCard } from '../../src/features/onboarding/components/OptionCard';
import { PillButton } from '../../src/components/ui/pill-button';
import { colors, radii } from '../../src/design/tokens';
import type { FitnessLevel } from '../../src/types/profile.types';

const TOTAL_STEPS = 8;

const LEVELS: { value: FitnessLevel; emoji: string; labelKey: string; subKey: string }[] = [
  { value: 'beginner', emoji: '🌱', labelKey: 'onboarding.training.beginner', subKey: 'onboarding.training.beginnerSub' },
  { value: 'intermediate', emoji: '⚡', labelKey: 'onboarding.training.intermediate', subKey: 'onboarding.training.intermediateSub' },
  { value: 'advanced', emoji: '🏆', labelKey: 'onboarding.training.advanced', subKey: 'onboarding.training.advancedSub' },
];

const DURATIONS = [30, 45, 60, 90];

export default function TrainingScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const { control, handleSubmit, watch } = useForm<TrainingFormData>({
    resolver: zodResolver(TrainingSchema),
    defaultValues: {
      fitnessLevel: profile.fitnessLevel ?? 'beginner',
      trainingDaysPerWeek: profile.trainingDaysPerWeek ?? 3,
      sessionDurationMin: profile.sessionDurationMin ?? 45,
    },
  });

  const daysValue = watch('trainingDaysPerWeek');

  const onSubmit = (data: TrainingFormData) => {
    updateProfile({
      fitnessLevel: data.fitnessLevel,
      trainingDaysPerWeek: data.trainingDaysPerWeek,
      sessionDurationMin: data.sessionDurationMin,
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
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand }}>
            ← {t('onboarding.back')}
          </Text>
        </Pressable>

        <OnboardingProgress current={3} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 28 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 8 }}>
            {t('onboarding.training.title')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.muted }}>
            {t('onboarding.training.subtitle')}
          </Text>
        </View>

        <View style={{ gap: 28 }}>
          {/* Fitness level */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 12 }}>
              {t('onboarding.training.fitnessLevel')}
            </Text>
            <Controller
              control={control}
              name="fitnessLevel"
              render={({ field: { value, onChange } }) => (
                <View style={{ gap: 10 }}>
                  {LEVELS.map((lvl) => (
                    <OptionCard
                      key={lvl.value}
                      testID={`level-option-${lvl.value}`}
                      emoji={lvl.emoji}
                      label={t(lvl.labelKey)}
                      subtitle={t(lvl.subKey)}
                      selected={value === lvl.value}
                      onPress={() => onChange(lvl.value)}
                    />
                  ))}
                </View>
              )}
            />
          </View>

          {/* Days per week */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 12 }}>
              {t('onboarding.training.daysPerWeek')} — {daysValue}
            </Text>
            <Controller
              control={control}
              name="trainingDaysPerWeek"
              render={({ field: { value, onChange } }) => (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 2, 3, 4, 5, 6].map((d) => (
                    <Pressable
                      key={d}
                      testID={`days-option-${d}`}
                      onPress={() => onChange(d)}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: radii.chip,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: value === d ? colors.brand : colors.card,
                        borderWidth: 1.5,
                        borderColor: value === d ? colors.brand : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: value === d ? '#FFFFFF' : colors.ink,
                        }}
                      >
                        {d}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </View>

          {/* Session duration */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 12 }}>
              {t('onboarding.training.sessionDuration')}
            </Text>
            <Controller
              control={control}
              name="sessionDurationMin"
              render={({ field: { value, onChange } }) => (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {DURATIONS.map((d) => (
                    <Pressable
                      key={d}
                      testID={`duration-option-${d}`}
                      onPress={() => onChange(d)}
                      style={{
                        flex: 1,
                        height: 52,
                        borderRadius: radii.chip,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: value === d ? colors.brand : colors.card,
                        borderWidth: 1.5,
                        borderColor: value === d ? colors.brand : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: value === d ? '#FFFFFF' : colors.ink,
                        }}
                      >
                        {d}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: value === d ? 'rgba(255,255,255,0.8)' : colors.muted,
                        }}
                      >
                        {t('onboarding.training.minUnit')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </View>
        </View>

        <View style={{ marginTop: 32 }}>
          <PillButton
            label={t('onboarding.next')}
            size="lg"
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
