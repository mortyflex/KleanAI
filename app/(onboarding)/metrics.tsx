import React, { useMemo } from 'react';
import {
  View,
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

import { MetricsSchema, type MetricsFormData } from '../../src/features/onboarding/schemas';
import { useOnboarding } from '../../src/features/onboarding/onboarding-context';
import { OnboardingProgress } from '../../src/features/onboarding/components/OnboardingProgress';
import { TargetWeightDiff } from '../../src/features/onboarding/components/TargetWeightDiff';
import { PillButton } from '../../src/components/ui/pill-button';
import { KleanText } from '../../src/components/ui/klean-text';
import { colors, radii } from '../../src/design/tokens';
import type { Gender } from '../../src/types/profile.types';
import { classifyGoal } from '../../src/utils/goal-classification';

const TOTAL_STEPS = 10;

function FieldLabel({ label }: { label: string }) {
  return (
    <KleanText variant="caption" color={colors.muted} weight="700" style={{ marginBottom: 6 }}>
      {label}
    </KleanText>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <KleanText variant="caption" color={colors.energy} style={{ marginTop: 4 }} testID="field-error">
      {message}
    </KleanText>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  testID,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder: string;
  testID?: string;
}) {
  return (
    <TextInput
      testID={testID}
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      value={value !== undefined ? String(value) : ''}
      onChangeText={(text) => {
        const n = parseFloat(text);
        onChange(isNaN(n) ? undefined : n);
      }}
      style={{
        height: 52,
        backgroundColor: colors.card,
        borderRadius: radii.chip,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: 16,
        fontSize: 16,
        color: colors.ink,
      }}
    />
  );
}

const GENDERS: { value: Gender; labelKey: string }[] = [
  { value: 'male', labelKey: 'onboarding.metrics.genderMale' },
  { value: 'female', labelKey: 'onboarding.metrics.genderFemale' },
  { value: 'other', labelKey: 'onboarding.metrics.genderOther' },
];

export default function MetricsScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { profile, updateProfile } = useOnboarding();

  const needsTarget =
    profile.goal === 'lose_weight' ||
    profile.goal === 'gain_muscle' ||
    profile.goal === 'maintain';

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MetricsFormData>({
    resolver: zodResolver(MetricsSchema),
    defaultValues: {
      age: profile.age,
      gender: profile.gender,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      goal: profile.goal,
    },
    mode: 'onChange',
  });

  const watchedWeight = watch('weightKg');
  const watchedTarget = watch('targetWeightKg');
  const watchedAge = watch('age');
  const watchedGender = watch('gender');
  const watchedHeight = watch('heightCm');

  // Live classification — shown as a status badge on the diff card.
  const liveStatus = useMemo(() => {
    if (
      !profile.goal ||
      watchedWeight === undefined ||
      watchedTarget === undefined ||
      watchedAge === undefined ||
      !watchedGender ||
      watchedHeight === undefined
    ) {
      return undefined;
    }
    const result = classifyGoal({
      goal: profile.goal,
      age: watchedAge,
      gender: watchedGender,
      weightKg: watchedWeight,
      heightCm: watchedHeight,
      targetWeightKg: watchedTarget,
      targetTimeframeWeeks: profile.targetTimeframe?.durationWeeks,
      trainingDaysPerWeek: profile.trainingDaysPerWeek ?? 3,
    });
    return result.kind;
  }, [profile.goal, profile.targetTimeframe, profile.trainingDaysPerWeek, watchedAge, watchedGender, watchedHeight, watchedWeight, watchedTarget]);

  const onSubmit = (data: MetricsFormData) => {
    updateProfile({
      age: data.age,
      gender: data.gender,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      targetWeightKg: data.targetWeightKg,
    });
    router.push('/(onboarding)/fitness-level');
  };

  const getErrorMessage = (errKey: string | undefined) => {
    if (!errKey) return undefined;
    const key = `onboarding.metrics.errors.${errKey}`;
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
            <KleanText variant="label" color={colors.brand}>
              ← {t('onboarding.back')}
            </KleanText>
          </Pressable>

          <OnboardingProgress current={2} total={TOTAL_STEPS} />

          <View style={{ marginTop: 32, marginBottom: 28 }}>
            <KleanText variant="h1" color={colors.ink} style={{ marginBottom: 8 }}>
              {t('onboarding.metrics.title')}
            </KleanText>
            <KleanText variant="secondary" color={colors.muted}>
              {t('onboarding.metrics.subtitle')}
            </KleanText>
          </View>

          <View style={{ gap: 20 }}>
            <View>
              <FieldLabel label={t('onboarding.metrics.age')} />
              <Controller
                control={control}
                name="age"
                render={({ field: { value, onChange } }) => (
                  <NumberInput
                    testID="input-age"
                    value={value}
                    onChange={onChange}
                    placeholder={t('onboarding.metrics.agePlaceholder')}
                  />
                )}
              />
              <FieldError message={getErrorMessage(errors.age?.message)} />
            </View>

            <View>
              <FieldLabel label={t('onboarding.metrics.gender')} />
              <Controller
                control={control}
                name="gender"
                render={({ field: { value, onChange } }) => (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {GENDERS.map((g) => (
                      <Pressable
                        key={g.value}
                        testID={`gender-option-${g.value}`}
                        onPress={() => onChange(g.value)}
                        style={{
                          flex: 1,
                          height: 48,
                          borderRadius: radii.chip,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: value === g.value ? colors.brandLight : colors.card,
                          borderWidth: 1.5,
                          borderColor: value === g.value ? colors.brand : colors.border,
                        }}
                      >
                        <KleanText
                          variant="label"
                          color={value === g.value ? colors.brand : colors.muted}
                          weight="700"
                        >
                          {t(g.labelKey)}
                        </KleanText>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
              <FieldError message={getErrorMessage(errors.gender?.message)} />
            </View>

            <View>
              <FieldLabel label={t('onboarding.metrics.height')} />
              <Controller
                control={control}
                name="heightCm"
                render={({ field: { value, onChange } }) => (
                  <NumberInput
                    testID="input-height"
                    value={value}
                    onChange={onChange}
                    placeholder={t('onboarding.metrics.heightPlaceholder')}
                  />
                )}
              />
              <FieldError message={getErrorMessage(errors.heightCm?.message)} />
            </View>

            <View>
              <FieldLabel label={t('onboarding.metrics.weight')} />
              <Controller
                control={control}
                name="weightKg"
                render={({ field: { value, onChange } }) => (
                  <NumberInput
                    testID="input-weight"
                    value={value}
                    onChange={onChange}
                    placeholder={t('onboarding.metrics.weightPlaceholder')}
                  />
                )}
              />
              <FieldError message={getErrorMessage(errors.weightKg?.message)} />
            </View>

            {needsTarget && (
              <View>
                <FieldLabel label={t('onboarding.metrics.targetWeight')} />
                <Controller
                  control={control}
                  name="targetWeightKg"
                  render={({ field: { value, onChange } }) => (
                    <NumberInput
                      testID="input-target-weight"
                      value={value}
                      onChange={onChange}
                      placeholder={t('onboarding.metrics.targetWeightPlaceholder')}
                    />
                  )}
                />
                <KleanText variant="caption" color={colors.muted} style={{ marginTop: 4 }}>
                  {t('onboarding.metrics.targetWeightHint')}
                </KleanText>
                <FieldError message={getErrorMessage(errors.targetWeightKg?.message)} />

                <TargetWeightDiff
                  testID="target-weight-diff"
                  currentWeightKg={watchedWeight}
                  targetWeightKg={watchedTarget}
                  goal={profile.goal}
                  status={liveStatus}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
