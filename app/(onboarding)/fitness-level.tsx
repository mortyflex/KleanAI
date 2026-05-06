import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  FitnessLevelSchema,
  type FitnessLevelFormData,
} from '../../src/features/onboarding/schemas';
import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { PillButton } from '../../src/components/ui/pill-button';
import { KleanText } from '../../src/components/ui/klean-text';
import { colors, radii } from '../../src/design/tokens';
import type { FitnessLevel } from '../../src/types/profile.types';

const TOTAL_STEPS = 10;

const LEVELS: { value: FitnessLevel; emoji: string; titleKey: string; descKey: string }[] = [
  {
    value: 'beginner',
    emoji: '🌱',
    titleKey: 'onboarding.fitnessLevel.beginnerTitle',
    descKey: 'onboarding.fitnessLevel.beginnerDescription',
  },
  {
    value: 'intermediate',
    emoji: '⚡',
    titleKey: 'onboarding.fitnessLevel.intermediateTitle',
    descKey: 'onboarding.fitnessLevel.intermediateDescription',
  },
  {
    value: 'advanced',
    emoji: '🏆',
    titleKey: 'onboarding.fitnessLevel.advancedTitle',
    descKey: 'onboarding.fitnessLevel.advancedDescription',
  },
];

export default function FitnessLevelScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const { control, handleSubmit, watch } = useForm<FitnessLevelFormData>({
    resolver: zodResolver(FitnessLevelSchema),
    defaultValues: {
      fitnessLevel: profile.fitnessLevel ?? 'beginner',
    },
  });

  const selected = watch('fitnessLevel');

  const onSubmit = (data: FitnessLevelFormData) => {
    updateProfile({ fitnessLevel: data.fitnessLevel });
    router.push('/(onboarding)/session-duration');
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

        <OnboardingProgress current={3} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 28 }}>
          <KleanText variant="h1" color={colors.ink} style={{ marginBottom: 8 }}>
            {t('onboarding.fitnessLevel.title')}
          </KleanText>
          <KleanText variant="secondary" color={colors.muted}>
            {t('onboarding.fitnessLevel.subtitle')}
          </KleanText>
        </View>

        <Controller
          control={control}
          name="fitnessLevel"
          render={({ field: { value, onChange } }) => (
            <View style={{ gap: 12 }}>
              {LEVELS.map((lvl) => {
                const isActive = value === lvl.value;
                return (
                  <Pressable
                    key={lvl.value}
                    testID={`fitness-level-option-${lvl.value}`}
                    onPress={() => onChange(lvl.value)}
                    style={{
                      padding: 18,
                      borderRadius: radii.card,
                      backgroundColor: isActive ? colors.brandLight : colors.card,
                      borderWidth: isActive ? 2 : 1.5,
                      borderColor: isActive ? colors.brand : colors.border,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: isActive ? colors.brandMid : colors.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <KleanText variant="bodyLarge">{lvl.emoji}</KleanText>
                      </View>
                      <KleanText
                        variant="bodyMedium"
                        color={isActive ? colors.brand : colors.ink}
                        weight="700"
                      >
                        {t(lvl.titleKey)}
                      </KleanText>
                    </View>
                    <KleanText variant="caption" color={colors.muted}>
                      {t(lvl.descKey)}
                    </KleanText>
                  </Pressable>
                );
              })}
            </View>
          )}
        />

        <View style={{ marginTop: 32 }}>
          <PillButton
            label={t('onboarding.next')}
            size="lg"
            disabled={!selected}
            onPress={handleSubmit(onSubmit)}
            style={{ opacity: selected ? 1 : 0.4 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
