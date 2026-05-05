import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { TimeframeSchema, type TimeframeFormData } from '../../src/features/onboarding/schemas';
import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { PillButton } from '../../src/components/ui/pill-button';
import { colors, radii } from '../../src/design/tokens';
import type { EventLabel } from '../../src/types/profile.types';

const TOTAL_STEPS = 8;
const PRESET_DURATIONS = [4, 8, 12] as const;
type PresetDuration = (typeof PRESET_DURATIONS)[number];

const EVENT_LABELS: { value: EventLabel; labelKey: string }[] = [
  { value: 'wedding', labelKey: 'onboarding.timeframe.eventWedding' },
  { value: 'vacation', labelKey: 'onboarding.timeframe.eventVacation' },
  { value: 'competition', labelKey: 'onboarding.timeframe.eventCompetition' },
  { value: 'other', labelKey: 'onboarding.timeframe.eventOther' },
];

function isPresetDuration(v: number | undefined): v is PresetDuration {
  return PRESET_DURATIONS.includes(v as PresetDuration);
}

export default function TimeframeScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const existingDuration = profile.targetTimeframe?.durationWeeks;
  const [useCustom, setUseCustom] = useState(
    existingDuration !== undefined && !isPresetDuration(existingDuration)
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TimeframeFormData>({
    resolver: zodResolver(TimeframeSchema),
    defaultValues: {
      durationWeeks: existingDuration ?? 12,
      eventLabel: profile.targetTimeframe?.eventLabel,
    },
  });

  const onSubmit = (data: TimeframeFormData) => {
    updateProfile({
      targetTimeframe: {
        durationWeeks: data.durationWeeks,
        eventLabel: data.eventLabel,
      },
    });
    router.push('/(onboarding)/safety-review');
  };

  const getErrorMessage = (errKey: string | undefined) => {
    if (!errKey) return undefined;
    const key = `onboarding.timeframe.errors.${errKey}`;
    const msg = t(key);
    return msg !== key ? msg : errKey;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand }}>
              ← {t('onboarding.back')}
            </Text>
          </Pressable>

          <OnboardingProgress current={6} total={TOTAL_STEPS} />

          <View style={{ marginTop: 32, marginBottom: 28 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 8 }}>
              {t('onboarding.timeframe.title')}
            </Text>
            <Text style={{ fontSize: 15, color: colors.muted }}>
              {t('onboarding.timeframe.subtitle')}
            </Text>
          </View>

          {/* Duration presets */}
          <Text
            style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 12 }}
          >
            {t('onboarding.timeframe.presetTitle')}
          </Text>

          <Controller
            control={control}
            name="durationWeeks"
            render={({ field: { value, onChange } }) => (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {PRESET_DURATIONS.map((d) => {
                    const isActive = !useCustom && value === d;
                    return (
                      <Pressable
                        key={d}
                        testID={`preset-${d}`}
                        onPress={() => {
                          setUseCustom(false);
                          onChange(d);
                        }}
                        style={{
                          flex: 1,
                          height: 52,
                          borderRadius: radii.chip,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isActive ? colors.brandLight : colors.card,
                          borderWidth: 1.5,
                          borderColor: isActive ? colors.brand : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: isActive ? colors.brand : colors.ink,
                          }}
                        >
                          {t(`onboarding.timeframe.${d}weeks`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom option */}
                <Pressable
                  testID="preset-custom"
                  onPress={() => {
                    setUseCustom(true);
                    if (isPresetDuration(value)) {
                      onChange(undefined);
                    }
                  }}
                  style={{
                    height: 52,
                    borderRadius: radii.chip,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: useCustom ? colors.brandLight : colors.card,
                    borderWidth: 1.5,
                    borderColor: useCustom ? colors.brand : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: useCustom ? colors.brand : colors.ink,
                    }}
                  >
                    {t('onboarding.timeframe.custom')}
                  </Text>
                </Pressable>

                {useCustom && (
                  <View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.muted,
                        marginBottom: 6,
                      }}
                    >
                      {t('onboarding.timeframe.customLabel')}
                    </Text>
                    <TextInput
                      testID="input-custom-weeks"
                      keyboardType="numeric"
                      placeholder={t('onboarding.timeframe.customPlaceholder')}
                      placeholderTextColor={colors.muted}
                      value={value !== undefined ? String(value) : ''}
                      onChangeText={(text) => {
                        const n = parseInt(text, 10);
                        onChange(isNaN(n) ? undefined : n);
                      }}
                      style={{
                        height: 52,
                        backgroundColor: colors.card,
                        borderRadius: radii.chip,
                        borderWidth: 1.5,
                        borderColor: errors.durationWeeks ? colors.energy : colors.border,
                        paddingHorizontal: 16,
                        fontSize: 16,
                        color: colors.ink,
                      }}
                    />
                    {errors.durationWeeks && (
                      <Text style={{ fontSize: 12, color: colors.energy, marginTop: 4 }}>
                        {getErrorMessage(errors.durationWeeks.message)}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          />

          {/* Event label (optional) */}
          <View style={{ marginTop: 28 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted }}>
                {t('onboarding.timeframe.eventTitle')}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {t('onboarding.timeframe.eventOptional')}
              </Text>
            </View>

            <Controller
              control={control}
              name="eventLabel"
              render={({ field: { value, onChange } }) => (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {EVENT_LABELS.map((e) => {
                    const isActive = value === e.value;
                    return (
                      <Pressable
                        key={e.value}
                        testID={`event-${e.value}`}
                        onPress={() => onChange(isActive ? undefined : e.value)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: radii.pill,
                          backgroundColor: isActive ? colors.brandLight : colors.card,
                          borderWidth: 1.5,
                          borderColor: isActive ? colors.brand : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: isActive ? colors.brand : colors.ink,
                          }}
                        >
                          {t(e.labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>

          <View style={{ marginTop: 32 }}>
            <PillButton
              label={t('onboarding.next')}
              size="lg"
              onPress={handleSubmit(onSubmit)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
