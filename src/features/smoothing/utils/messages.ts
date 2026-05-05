import type { SmoothingEventType, SmoothingCategory } from '../../../types/smoothing.types';

interface EventCopy {
  category: SmoothingCategory;
  messageKey: string;
  recommendationKey: string;
}

export const EVENT_COPY: Record<SmoothingEventType, EventCopy> = {
  missed_workout: {
    category: 'workout',
    messageKey: 'smoothing.events.missed_workout.message',
    recommendationKey: 'smoothing.events.missed_workout.recommendation',
  },
  partial_workout: {
    category: 'workout',
    messageKey: 'smoothing.events.partial_workout.message',
    recommendationKey: 'smoothing.events.partial_workout.recommendation',
  },
  excess_food: {
    category: 'nutrition',
    messageKey: 'smoothing.events.excess_food.message',
    recommendationKey: 'smoothing.events.excess_food.recommendation',
  },
  skipped_meal: {
    category: 'nutrition',
    messageKey: 'smoothing.events.skipped_meal.message',
    recommendationKey: 'smoothing.events.skipped_meal.recommendation',
  },
  ordered_food: {
    category: 'nutrition',
    messageKey: 'smoothing.events.ordered_food.message',
    recommendationKey: 'smoothing.events.ordered_food.recommendation',
  },
  alcohol: {
    category: 'nutrition',
    messageKey: 'smoothing.events.alcohol.message',
    recommendationKey: 'smoothing.events.alcohol.recommendation',
  },
  no_machine: {
    category: 'workout',
    messageKey: 'smoothing.events.no_machine.message',
    recommendationKey: 'smoothing.events.no_machine.recommendation',
  },
  no_time: {
    category: 'workout',
    messageKey: 'smoothing.events.no_time.message',
    recommendationKey: 'smoothing.events.no_time.recommendation',
  },
};

export const UNKNOWN_EVENT_MESSAGE_KEY = 'smoothing.feedback.unknownEvent.message';
export const TITLE_KEY = 'smoothing.feedback.title';
export const ZERO_GUILT_BANNER_KEY = 'smoothing.feedback.zeroGuiltBanner';
