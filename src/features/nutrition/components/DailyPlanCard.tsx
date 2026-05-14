import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { colors } from '../../../design/tokens';
import type { DailyNutritionPlan } from '../utils/nutrition-plan';

interface DailyPlanCardProps {
  plan: DailyNutritionPlan | null;
  testID?: string;
}

/**
 * Compact card showing today's calorie + protein target. We deliberately
 * avoid an "eaten so far" counter here — Klean AI is not a tracking app
 * and that would push the user into obsessive logging.
 */
export function DailyPlanCard({ plan, testID }: DailyPlanCardProps) {
  const { t } = useTranslation('common');

  if (!plan) {
    return (
      <Card style={{ gap: 8 }} testID={testID ?? 'nutrition-plan-card'}>
        <KleanText
          variant="caption"
          color={colors.muted}
          style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}
        >
          {t('nutrition.plan.title')}
        </KleanText>
        <KleanText variant="h3" color={colors.ink}>
          {t('nutrition.plan.incompleteTitle')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {t('nutrition.plan.incompleteBody')}
        </KleanText>
      </Card>
    );
  }

  return (
    <Card style={{ gap: 14 }} testID={testID ?? 'nutrition-plan-card'}>
      <View style={{ gap: 4 }}>
        <KleanText
          variant="caption"
          color={colors.muted}
          style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}
        >
          {t('nutrition.plan.title')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {t('nutrition.plan.subtitle')}
        </KleanText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <KleanText variant="display" color={colors.ink}>
          {plan.calories.toLocaleString()}
        </KleanText>
        <KleanText
          variant="body"
          color={colors.muted}
          style={{ paddingBottom: 6 }}
        >
          {t('nutrition.meals.kcalUnit')}
        </KleanText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={t('nutrition.macros.proteinUnit', { grams: plan.proteinG })}
          color={colors.brand}
          background={colors.brandLight}
        />
        <Pill
          label={`${plan.carbsG} g ${t('nutrition.macros.carbs').toLowerCase()}`}
          color={colors.amber}
          background={colors.amberLight}
        />
        <Pill
          label={`${plan.fatG} g ${t('nutrition.macros.fat').toLowerCase()}`}
          color={colors.energy}
          background={colors.energyLight}
        />
      </View>

      <KleanText variant="caption" color={colors.muted}>
        {t('nutrition.plan.estimateLabel')}
      </KleanText>
    </Card>
  );
}

function Pill({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 100,
        backgroundColor: background,
      }}
    >
      <KleanText variant="label" color={color}>
        {label}
      </KleanText>
    </View>
  );
}
