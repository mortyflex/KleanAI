export { useNutritionLogger } from './hooks/useNutritionLogger';
export { useNutritionEventReporter } from './hooks/useNutritionEventReporter';
export { queueNutritionSync } from './services/nutrition-sync';
export { getDay, saveDay, clearDay } from './store/nutrition-storage';
export {
  nutritionQueryKeys,
  nutritionMutationKeys,
} from './queries/nutrition-query-keys';
export {
  computeDailyPlan,
  planInputFromProfile,
  PROTEIN_PER_KG,
  FAT_RATIO,
  HYDRATION_GLASSES_DEFAULT,
} from './utils/nutrition-plan';
export type {
  DailyNutritionPlan,
  PlanInput,
} from './utils/nutrition-plan';
export {
  MEAL_CATALOG,
  getMealSuggestions,
  getDailyMealPlan,
  getDailyMealPlanWithFridge,
  getFridgeAwareSuggestions,
  scoreMealAgainstFridge,
} from './utils/meal-suggestions';
export type {
  MealSuggestion,
  MealType,
  SuggestionsQuery,
  FridgeAwareSuggestionsQuery,
} from './utils/meal-suggestions';
export {
  buildSmoothingEvent,
  reportNutritionEvent,
  isAcknowledgedResult,
  NUTRITION_EVENT_TYPES,
  NUTRITION_SMOOTHING_EVENT_TYPES,
  DEFAULT_EXCESS_KCAL,
} from './utils/nutrition-events';
export type {
  NutritionEventType,
  NutritionEventResult,
  ReportNutritionEventInput,
  AcknowledgedResult,
} from './utils/nutrition-events';
export type {
  DailyNutritionRecord,
  NutritionSyncStatus,
} from './types';
export { DailyPlanCard } from './components/DailyPlanCard';
export { MealSuggestionsList } from './components/MealSuggestionsList';
export { NutritionEventReporter } from './components/NutritionEventReporter';
