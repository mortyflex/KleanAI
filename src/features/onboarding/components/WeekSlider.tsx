import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii } from '../../../design/tokens';
import { KleanText } from '../../../components/ui/klean-text';

interface WeekSliderProps {
  value: number;
  onChange: (weeks: number) => void;
  min?: number;
  max?: number;
  recommended?: number;
  testID?: string;
}

/**
 * Designed week slider for the onboarding timeframe screen.
 *
 * The control is intentionally button-driven (rather than gesture-driven)
 * so it is reliable in unit tests and keyboard-accessible. The visual
 * track communicates "slider feel" with a filled portion and a recommended
 * marker, while the +/- buttons drive the actual selection.
 */
export function WeekSlider({
  value,
  onChange,
  min = 4,
  max = 52,
  recommended,
  testID,
}: WeekSliderProps) {
  const { t } = useTranslation('common');

  const clamped = Math.max(min, Math.min(max, value));
  const fillPct = ((clamped - min) / (max - min)) * 100;
  const recommendedPct =
    recommended !== undefined && recommended >= min && recommended <= max
      ? ((recommended - min) / (max - min)) * 100
      : undefined;

  const dec = () => onChange(Math.max(min, clamped - 1));
  const inc = () => onChange(Math.min(max, clamped + 1));

  const presetShort = recommended ? Math.max(min, Math.floor(recommended * 0.5)) : 4;
  const presetIdeal = recommended ?? 12;
  const presetLong = recommended ? Math.min(max, Math.ceil(recommended * 1.5)) : 16;

  return (
    <View style={{ gap: 14 }} testID={testID}>
      {/* Big number + unit */}
      <View style={{ alignItems: 'center', gap: 4 }}>
        <KleanText variant="metric" color={colors.ink}>
          {clamped}
        </KleanText>
        <KleanText variant="caption" color={colors.muted}>
          {t('onboarding.timeframe.weeksUnit', { count: clamped })}
        </KleanText>
      </View>

      {/* Track */}
      <View
        style={{
          height: 14,
          backgroundColor: colors.border,
          borderRadius: 7,
          overflow: 'visible',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            height: 14,
            width: `${fillPct}%`,
            backgroundColor: colors.brand,
            borderRadius: 7,
          }}
        />
        {recommendedPct !== undefined && (
          <View
            testID="week-slider-recommended-marker"
            style={{
              position: 'absolute',
              left: `${recommendedPct}%`,
              top: -4,
              width: 2,
              height: 22,
              backgroundColor: colors.mint,
              borderRadius: 1,
              marginLeft: -1,
            }}
          />
        )}
        <View
          style={{
            position: 'absolute',
            left: `${fillPct}%`,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: colors.card,
            borderWidth: 3,
            borderColor: colors.brand,
            marginLeft: -11,
            top: -4,
          }}
        />
      </View>

      {/* Stepper buttons */}
      <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
        <Pressable
          testID="week-slider-decrement"
          accessibilityLabel="decrement"
          onPress={dec}
          style={{
            width: 56,
            height: 44,
            borderRadius: radii.pill,
            backgroundColor: colors.card,
            borderWidth: 1.5,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KleanText variant="bodyMedium" color={colors.ink}>−</KleanText>
        </Pressable>
        <Pressable
          testID="week-slider-increment"
          accessibilityLabel="increment"
          onPress={inc}
          style={{
            width: 56,
            height: 44,
            borderRadius: radii.pill,
            backgroundColor: colors.card,
            borderWidth: 1.5,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KleanText variant="bodyMedium" color={colors.ink}>+</KleanText>
        </Pressable>
      </View>

      {/* Quick presets */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { weeks: presetShort, key: 'short' as const },
          { weeks: presetIdeal, key: 'ideal' as const },
          { weeks: presetLong, key: 'long' as const },
        ].map((p) => {
          const labelKey =
            p.key === 'short'
              ? 'onboarding.timeframe.presetShort'
              : p.key === 'ideal'
                ? 'onboarding.timeframe.presetIdeal'
                : 'onboarding.timeframe.presetLong';
          const isActive = clamped === p.weeks;
          return (
            <Pressable
              key={p.key}
              testID={`week-slider-preset-${p.key}`}
              onPress={() => onChange(p.weeks)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: radii.chip,
                backgroundColor: isActive ? colors.brandLight : colors.card,
                borderWidth: 1.5,
                borderColor: isActive ? colors.brand : colors.border,
                alignItems: 'center',
              }}
            >
              <KleanText
                variant="caption"
                color={isActive ? colors.brand : colors.ink}
                weight="700"
              >
                {t(labelKey, { weeks: p.weeks })}
              </KleanText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
