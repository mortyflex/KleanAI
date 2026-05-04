import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { LocationSchema, type LocationFormData } from '../../src/features/onboarding/schemas';
import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { OptionCard } from '../../src/features/onboarding/components/OptionCard';
import { PillButton } from '../../src/components/ui/pill-button';
import { colors, radii } from '../../src/design/tokens';
import type { TrainingLocation, GymChain } from '../../src/types/profile.types';

const TOTAL_STEPS = 7;

const LOCATION_OPTIONS: { value: TrainingLocation; emoji: string; labelKey: string; subKey: string }[] = [
  { value: 'gym', emoji: '🏋️', labelKey: 'onboarding.location.gym', subKey: 'onboarding.location.gymSub' },
  { value: 'home', emoji: '🏠', labelKey: 'onboarding.location.home', subKey: 'onboarding.location.homeSub' },
  { value: 'both', emoji: '🔀', labelKey: 'onboarding.location.both', subKey: 'onboarding.location.bothSub' },
];

const GYM_CHAINS: { value: GymChain; labelKey: string }[] = [
  { value: 'basic_fit', labelKey: 'onboarding.location.basicFit' },
  { value: 'fitness_park', labelKey: 'onboarding.location.fitnessPark' },
  { value: 'on_air', labelKey: 'onboarding.location.onAir' },
  { value: 'other', labelKey: 'onboarding.location.otherGym' },
];

export default function LocationScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const { control, handleSubmit, watch } = useForm<LocationFormData>({
    resolver: zodResolver(LocationSchema),
    defaultValues: {
      trainingLocation: profile.trainingLocation ?? 'gym',
      gymChain: profile.gymChain,
    },
  });

  const locationValue = watch('trainingLocation');
  const showGymChain = locationValue === 'gym' || locationValue === 'both';

  const onSubmit = (data: LocationFormData) => {
    updateProfile({
      trainingLocation: data.trainingLocation,
      gymChain: data.gymChain,
    });
    router.push('/(onboarding)/nutrition-prefs');
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

        <OnboardingProgress current={4} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 28 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 8 }}>
            {t('onboarding.location.title')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.muted }}>
            {t('onboarding.location.subtitle')}
          </Text>
        </View>

        <View style={{ gap: 28 }}>
          <Controller
            control={control}
            name="trainingLocation"
            render={({ field: { value, onChange } }) => (
              <View style={{ gap: 10 }}>
                {LOCATION_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    testID={`location-option-${opt.value}`}
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

          {showGymChain && (
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 12 }}>
                {t('onboarding.location.gymChain')}
              </Text>
              <Controller
                control={control}
                name="gymChain"
                render={({ field: { value, onChange } }) => (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {GYM_CHAINS.map((chain) => (
                      <Pressable
                        key={chain.value}
                        testID={`gym-chain-option-${chain.value}`}
                        onPress={() => onChange(value === chain.value ? undefined : chain.value)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: radii.pill,
                          backgroundColor:
                            value === chain.value ? colors.brandLight : colors.card,
                          borderWidth: 1.5,
                          borderColor:
                            value === chain.value ? colors.brand : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: value === chain.value ? colors.brand : colors.ink,
                          }}
                        >
                          {t(chain.labelKey)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>
          )}
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
