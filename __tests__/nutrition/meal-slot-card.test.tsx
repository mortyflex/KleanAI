import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import '../../src/lib/i18n';
import { MealSlotCard } from '../../src/features/nutrition/components/MealSlotCard';
import type { ChosenRecipeSnapshot } from '../../src/types/recipe.types';

const aiChosen: ChosenRecipeSnapshot = {
  recipeId: 'ai:breakfast:0:abc',
  source: 'ai',
  mealType: 'breakfast',
  title: 'Yogurt & berries bowl',
  description: 'Creamy, quick, high-protein.',
  estimatedCalories: 240,
  estimatedProteinG: 20,
  estimatedCarbsG: 22,
  estimatedFatG: 6,
  prepTimeMinutes: 5,
  tags: ['high_protein'],
  chosenAt: '2026-05-14T08:00:00Z',
  fridgeFingerprint: 'fp-old',
};

function renderCard(props: Partial<React.ComponentProps<typeof MealSlotCard>>) {
  const onAdaptWithFridge = jest.fn();
  render(
    <MealSlotCard
      mealType="breakfast"
      chosen={aiChosen}
      suggestion={null}
      eaten={false}
      onViewRecipe={jest.fn()}
      onAdaptWithFridge={onAdaptWithFridge}
      onMarkEaten={jest.fn()}
      onUnmarkEaten={jest.fn()}
      testID="meal-slot"
      {...props}
    />,
  );
  return { onAdaptWithFridge };
}

describe('MealSlotCard — stale recipe warning', () => {
  it('shows the stale banner when a chosen recipe is flagged stale', () => {
    renderCard({ stale: true });
    expect(screen.getByTestId('meal-slot-stale')).toBeTruthy();
    expect(screen.getByText('May no longer match your fridge')).toBeTruthy();
  });

  it('hides the stale banner when the recipe is not stale', () => {
    renderCard({ stale: false });
    expect(screen.queryByTestId('meal-slot-stale')).toBeNull();
  });

  it('never shows the stale banner when there is no chosen recipe', () => {
    renderCard({ chosen: null, stale: true });
    expect(screen.queryByTestId('meal-slot-stale')).toBeNull();
  });

  it('the stale banner CTA opens the recipe list (onAdaptWithFridge)', () => {
    const { onAdaptWithFridge } = renderCard({ stale: true });
    fireEvent.press(screen.getByTestId('meal-slot-stale-change'));
    expect(onAdaptWithFridge).toHaveBeenCalledTimes(1);
  });

  it('labels the adapt action "Change recipe" once a recipe is chosen', () => {
    renderCard({ stale: false });
    expect(screen.getByText('Change recipe')).toBeTruthy();
  });

  it('keeps the "Adapt with my fridge" label when no recipe is chosen', () => {
    renderCard({ chosen: null });
    expect(screen.getByText('Adapt with my fridge')).toBeTruthy();
  });
});
