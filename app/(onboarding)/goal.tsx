import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { GoalSchema, type GoalFormData } from '../../src/features/onboarding/schemas';
import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { OptionCard } from '../../src/features/onboarding/components/OptionCard';
import { PillButton } from '../../src/components/ui/pill-button';
import { colors } from '../../src/design/tokens';
import type { FitnessGoal } from '../../src/types/profile.types';

const TOTAL_STEPS = 8;

type GoalOption = {
  value: FitnessGoal;
  emojiKey: string;
  emoji: string;
  labelKey: string;
  subKey: string;
};

const GOAL_OPTIONS: GoalOption[] = [
  { value: 'lose_weight', emoji: '🔥', emojiKey: '', labelKey: 'onboarding.goal.loseWeight', subKey: 'onboarding.goal.loseWeightSub' },
  { value: 'gain_muscle', emoji: '💪', emojiKey: '', labelKey: 'onboarding.goal.gainMuscle', subKey: 'onboarding.goal.gainMuscleSub' },
  { value: 'maintain', emoji: '⚖️', emojiKey: '', labelKey: 'onboarding.goal.maintain', subKey: 'onboarding.goal.maintainSub' },
  { value: 'recomposition', emoji: '🔄', emojiKey: '', labelKey: 'onboarding.goal.recomposition', subKey: 'onboarding.goal.recompositionSub' },
];

export default function GoalScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const { control, handleSubmit, watch } = useForm<GoalFormData>({
    resolver: zodResolver(GoalSchema),
    defaultValues: { goal: profile.goal },
  });

  const selectedGoal = watch('goal');

  const onSubmit = (data: GoalFormData) => {
    updateProfile({ goal: data.goal });
    router.push('/(onboarding)/metrics');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingProgress current={1} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 28 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 8 }}>
            {t('onboarding.goal.title')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.muted }}>
            {t('onboarding.goal.subtitle')}
          </Text>
        </View>

        <Controller
          control={control}
          name="goal"
          render={({ field: { onChange, value } }) => (
            <View style={{ gap: 12 }}>
              {GOAL_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  testID={`goal-option-${opt.value}`}
                  emoji={opt.emoji}
                  label={t(opt.labelKey)}
                  subtitle={t(opt.subKey)}
                  selected={value === opt.value}
                  onPress={() => onChange(opt.value)}
                />
              ))}
            </View>
          )}
        />

        <View style={{ marginTop: 32 }}>
          <PillButton
            label={t('onboarding.next')}
            size="lg"
            disabled={!selectedGoal}
            onPress={handleSubmit(onSubmit)}
            style={{ opacity: selectedGoal ? 1 : 0.4 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
