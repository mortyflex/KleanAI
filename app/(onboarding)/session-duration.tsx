import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  SessionDurationSchema,
  type SessionDurationFormData,
} from '../../src/features/onboarding/schemas';
import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { PillButton } from '../../src/components/ui/pill-button';
import { KleanText } from '../../src/components/ui/klean-text';
import { colors, radii } from '../../src/design/tokens';

const TOTAL_STEPS = 10;

const DURATIONS: { value: 30 | 45 | 60 | 75; titleKey: string; descKey: string }[] = [
  { value: 30, titleKey: 'onboarding.sessionDuration.30Title', descKey: 'onboarding.sessionDuration.30Description' },
  { value: 45, titleKey: 'onboarding.sessionDuration.45Title', descKey: 'onboarding.sessionDuration.45Description' },
  { value: 60, titleKey: 'onboarding.sessionDuration.60Title', descKey: 'onboarding.sessionDuration.60Description' },
  { value: 75, titleKey: 'onboarding.sessionDuration.75Title', descKey: 'onboarding.sessionDuration.75Description' },
];

export default function SessionDurationScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const { control, handleSubmit, watch } = useForm<SessionDurationFormData>({
    resolver: zodResolver(SessionDurationSchema),
    defaultValues: {
      sessionDurationMin: ([30, 45, 60, 75] as const).includes(
        profile.sessionDurationMin as 30 | 45 | 60 | 75
      )
        ? (profile.sessionDurationMin as 30 | 45 | 60 | 75)
        : 45,
    },
  });

  const selected = watch('sessionDurationMin');

  const onSubmit = (data: SessionDurationFormData) => {
    updateProfile({ sessionDurationMin: data.sessionDurationMin });
    router.push('/(onboarding)/availability');
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

        <OnboardingProgress current={4} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 28 }}>
          <KleanText variant="h1" color={colors.ink} style={{ marginBottom: 8 }}>
            {t('onboarding.sessionDuration.title')}
          </KleanText>
          <KleanText variant="secondary" color={colors.muted}>
            {t('onboarding.sessionDuration.subtitle')}
          </KleanText>
        </View>

        <Controller
          control={control}
          name="sessionDurationMin"
          render={({ field: { value, onChange } }) => (
            <View style={{ gap: 12 }}>
              {DURATIONS.map((d) => {
                const isActive = value === d.value;
                return (
                  <Pressable
                    key={d.value}
                    testID={`session-duration-option-${d.value}`}
                    onPress={() => onChange(d.value)}
                    style={{
                      padding: 18,
                      borderRadius: radii.card,
                      backgroundColor: isActive ? colors.brandLight : colors.card,
                      borderWidth: isActive ? 2 : 1.5,
                      borderColor: isActive ? colors.brand : colors.border,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <KleanText
                        variant="h2"
                        color={isActive ? colors.brand : colors.ink}
                      >
                        {t(d.titleKey)}
                      </KleanText>
                    </View>
                    <KleanText variant="caption" color={colors.muted}>
                      {t(d.descKey)}
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
