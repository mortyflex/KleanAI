import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii } from '../../../design/tokens';
import { KleanText } from '../../../components/ui/klean-text';
import type { FitnessGoal, GoalClassificationKind } from '../../../types/profile.types';

interface TargetWeightDiffProps {
  currentWeightKg?: number;
  targetWeightKg?: number;
  goal?: FitnessGoal;
  /** Optional classification — when present, shown as a status badge. */
  status?: GoalClassificationKind;
  testID?: string;
}

function colorsForStatus(status?: GoalClassificationKind) {
  switch (status) {
    case 'unsafe':
    case 'inconsistent':
      return { bg: colors.energyLight, fg: colors.energy };
    case 'ambitious':
      return { bg: colors.amberLight, fg: colors.amber };
    case 'valid':
      return { bg: colors.mintLight, fg: colors.mint };
    default:
      return { bg: colors.bg, fg: colors.muted };
  }
}

export function TargetWeightDiff({
  currentWeightKg,
  targetWeightKg,
  goal,
  status,
  testID,
}: TargetWeightDiffProps) {
  const { t } = useTranslation('common');

  if (currentWeightKg === undefined || targetWeightKg === undefined) {
    return null;
  }

  const diff = targetWeightKg - currentWeightKg;
  const absDiff = Math.abs(diff).toFixed(1);

  let directionKey = 'onboarding.metrics.diff.directionMaintain';
  let deltaKey = 'onboarding.metrics.diff.deltaNeutral';
  let directionColor = colors.muted;

  if (diff < -0.05) {
    directionKey = 'onboarding.metrics.diff.directionLose';
    deltaKey = 'onboarding.metrics.diff.deltaLose';
    directionColor = colors.brand;
  } else if (diff > 0.05) {
    directionKey = 'onboarding.metrics.diff.directionGain';
    deltaKey = 'onboarding.metrics.diff.deltaGain';
    directionColor = colors.brand;
  }

  const statusKey =
    status === 'unsafe'
      ? 'onboarding.metrics.diff.statusUnsafe'
      : status === 'ambitious'
        ? 'onboarding.metrics.diff.statusAmbitious'
        : status === 'inconsistent'
          ? 'onboarding.metrics.diff.statusInconsistent'
          : status === 'valid'
            ? 'onboarding.metrics.diff.statusValid'
            : undefined;

  const statusColors = colorsForStatus(status);

  return (
    <View
      testID={testID}
      style={{
        marginTop: 12,
        padding: 16,
        borderRadius: radii.card,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'flex-start' }}>
          <KleanText variant="caption" color={colors.muted}>
            {t('onboarding.metrics.diff.current')}
          </KleanText>
          <KleanText variant="h2" color={colors.ink}>
            {currentWeightKg} kg
          </KleanText>
        </View>

        <KleanText variant="bodyLarge" color={directionColor}>
          →
        </KleanText>

        <View style={{ alignItems: 'flex-end' }}>
          <KleanText variant="caption" color={colors.muted}>
            {t('onboarding.metrics.diff.target')}
          </KleanText>
          <KleanText variant="h2" color={directionColor}>
            {targetWeightKg} kg
          </KleanText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <KleanText variant="label" color={directionColor} testID="target-weight-delta">
          {t(deltaKey, { kg: absDiff })}
        </KleanText>
        <KleanText variant="caption" color={colors.muted}>
          {t(directionKey)}
        </KleanText>
      </View>

      {statusKey && (
        <View
          testID="target-weight-status-badge"
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: radii.pill,
            backgroundColor: statusColors.bg,
          }}
        >
          <KleanText variant="caption" color={statusColors.fg} weight="700">
            {t(statusKey)}
          </KleanText>
        </View>
      )}
    </View>
  );
}
