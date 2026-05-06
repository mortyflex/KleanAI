import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { NutritionPrefsSchema, type NutritionPrefsFormData } from '../../src/features/onboarding/schemas';
import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { PillButton } from '../../src/components/ui/pill-button';
import { colors, radii } from '../../src/design/tokens';
import type { DietaryRestriction } from '../../src/types/profile.types';

const TOTAL_STEPS = 10;

const RESTRICTIONS: { value: DietaryRestriction; emoji: string; labelKey: string }[] = [
  { value: 'vegetarian', emoji: '🥦', labelKey: 'onboarding.nutritionPrefs.vegetarian' },
  { value: 'vegan', emoji: '🌱', labelKey: 'onboarding.nutritionPrefs.vegan' },
  { value: 'gluten_free', emoji: '🌾', labelKey: 'onboarding.nutritionPrefs.glutenFree' },
  { value: 'lactose_free', emoji: '🥛', labelKey: 'onboarding.nutritionPrefs.lactoseFree' },
  { value: 'halal', emoji: '☪️', labelKey: 'onboarding.nutritionPrefs.halal' },
  { value: 'kosher', emoji: '✡️', labelKey: 'onboarding.nutritionPrefs.kosher' },
];

export default function NutritionPrefsScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const { control, handleSubmit } = useForm<NutritionPrefsFormData>({
    resolver: zodResolver(NutritionPrefsSchema),
    defaultValues: {
      dietaryRestrictions: profile.dietaryRestrictions ?? [],
    },
  });

  const onSubmit = (data: NutritionPrefsFormData) => {
    updateProfile({ dietaryRestrictions: data.dietaryRestrictions });
    router.push('/(onboarding)/timeframe');
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

        <OnboardingProgress current={7} total={TOTAL_STEPS} />

        <View style={{ marginTop: 32, marginBottom: 28 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 8 }}>
            {t('onboarding.nutritionPrefs.title')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.muted }}>
            {t('onboarding.nutritionPrefs.subtitle')}
          </Text>
        </View>

        <Controller
          control={control}
          name="dietaryRestrictions"
          render={({ field: { value, onChange } }) => {
            const toggle = (restriction: DietaryRestriction) => {
              if (value.includes(restriction)) {
                onChange(value.filter((r) => r !== restriction));
              } else {
                onChange([...value, restriction]);
              }
            };

            return (
              <View style={{ gap: 12 }}>
                {/* "None" option — clears all selections */}
                <Pressable
                  testID="restriction-none"
                  onPress={() => onChange([])}
                  style={{
                    padding: 16,
                    borderRadius: radii.chip,
                    backgroundColor: value.length === 0 ? colors.brandLight : colors.card,
                    borderWidth: 1.5,
                    borderColor: value.length === 0 ? colors.brand : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: value.length === 0 ? colors.brand : colors.ink,
                      textAlign: 'center',
                    }}
                  >
                    {t('onboarding.nutritionPrefs.none')}
                  </Text>
                </Pressable>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {RESTRICTIONS.map((r) => {
                    const active = value.includes(r.value);
                    return (
                      <Pressable
                        key={r.value}
                        testID={`restriction-${r.value}`}
                        onPress={() => toggle(r.value)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: radii.pill,
                          backgroundColor: active ? colors.brandLight : colors.card,
                          borderWidth: 1.5,
                          borderColor: active ? colors.brand : colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>{r.emoji}</Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: active ? colors.brand : colors.ink,
                          }}
                        >
                          {t(r.labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          }}
        />

        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 16 }}>
          {t('onboarding.nutritionPrefs.hint')}
        </Text>

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
