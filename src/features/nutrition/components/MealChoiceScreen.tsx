import React, { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Card } from '../../../components/ui/card';
import { KleanText } from '../../../components/ui/klean-text';
import { PillButton } from '../../../components/ui/pill-button';
import { colors, radii } from '../../../design/tokens';
import { useConfirmedFridge } from '../../vision/hooks/useConfirmedFridge';
import type { MealType } from '../utils/meal-suggestions';

const MEAL_TYPES: { key: MealType; emoji: string }[] = [
  { key: 'breakfast', emoji: '🍳' },
  { key: 'lunch', emoji: '🥗' },
  { key: 'dinner', emoji: '🍽️' },
  { key: 'snack', emoji: '🥄' },
];

const MEAL_LABEL_KEYS: Record<MealType, string> = {
  breakfast: 'meals.breakfast',
  lunch: 'meals.lunch',
  dinner: 'meals.dinner',
  snack: 'meals.snacks',
};

interface MealChoiceCardProps {
  emoji: string;
  label: string;
  onPress: () => void;
  testID?: string;
}

function MealChoiceCard({ emoji, label, onPress, testID }: MealChoiceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.card,
        paddingHorizontal: 18,
        paddingVertical: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radii.icon + 4,
          backgroundColor: colors.brandLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <KleanText variant="h3" color={colors.brand}>
          {emoji}
        </KleanText>
      </View>
      <View style={{ flex: 1 }}>
        <KleanText variant="bodyMedium" color={colors.ink} weight="700">
          {label}
        </KleanText>
      </View>
      <KleanText variant="h3" color={colors.muted}>
        ›
      </KleanText>
    </Pressable>
  );
}

/**
 * Lets the user pick what they want to cook now after confirming their fridge
 * (or from the Nutrition Today screen). The four mealType options are
 * primary; "full day" is intentionally secondary so users get a focused
 * single-meal recommendation by default.
 */
export function MealChoiceScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { ingredientIds, unmappedLabels } = useConfirmedFridge();

  const goToList = useCallback(
    (mealType: MealType) => {
      router.push({
        pathname: '/recipes/list',
        params: { mealType },
      });
    },
    [router],
  );

  const goToFullDay = useCallback(() => {
    router.push({ pathname: '/recipes/full-day' });
  }, [router]);

  const fridgeCount =
    (ingredientIds?.length ?? 0) + (unmappedLabels?.length ?? 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 64,
        paddingBottom: 48,
        gap: 18,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 6 }}>
        <KleanText variant="h1" color={colors.ink}>
          {t('recipes.mealChoice.title')}
        </KleanText>
        <KleanText variant="body" color={colors.muted}>
          {fridgeCount > 0
            ? t('recipes.mealChoice.subtitleWithFridge', { count: fridgeCount })
            : t('recipes.mealChoice.subtitleNoFridge')}
        </KleanText>
      </View>

      <View style={{ gap: 12 }}>
        {MEAL_TYPES.map((meal) => (
          <MealChoiceCard
            key={meal.key}
            emoji={meal.emoji}
            label={t(MEAL_LABEL_KEYS[meal.key])}
            onPress={() => goToList(meal.key)}
            testID={`meal-choice-${meal.key}`}
          />
        ))}
      </View>

      <Card style={{ gap: 10 }}>
        <KleanText variant="caption" color={colors.muted} weight="700">
          {t('recipes.mealChoice.fullDayLabel')}
        </KleanText>
        <KleanText variant="bodyMedium" color={colors.ink}>
          {t('recipes.mealChoice.fullDayTitle')}
        </KleanText>
        <KleanText variant="caption" color={colors.muted}>
          {t('recipes.mealChoice.fullDayBody')}
        </KleanText>
        <PillButton
          label={t('recipes.mealChoice.fullDayCta')}
          variant="outline"
          onPress={goToFullDay}
          testID="meal-choice-full-day"
        />
      </Card>

      <PillButton
        label={t('recipes.mealChoice.backCta')}
        variant="ghost"
        onPress={() => router.back()}
      />
    </ScrollView>
  );
}
