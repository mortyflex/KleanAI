import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../design/tokens';

interface OnboardingProgressProps {
  current: number;
  total: number;
}

export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const { t } = useTranslation('common');
  const pct = (current / total) * 100;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, letterSpacing: 0.5 }}>
        {t('onboarding.step', { current, total })}
      </Text>
      <View
        style={{
          height: 4,
          backgroundColor: colors.border,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: colors.brand,
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}
