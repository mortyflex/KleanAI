import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card } from '../../src/components/ui/card';
import { PillButton } from '../../src/components/ui/pill-button';
import { colors, radii, shadows } from '../../src/design/tokens';
import { useWorkoutProgram } from '../../src/features/workout/hooks/useWorkoutProgram';
import type { WorkoutExercise, MuscleGroup, WorkoutIntensity } from '../../src/types/workout.types';

const MUSCLE_COLOR_MAP: Partial<Record<MuscleGroup, { bg: string; fg: string }>> = {
  chest:       { bg: colors.energyLight, fg: colors.energy },
  back:        { bg: colors.skyLight,    fg: colors.sky    },
  shoulders:   { bg: colors.brandLight,  fg: colors.brand  },
  biceps:      { bg: colors.mintLight,   fg: colors.mint   },
  triceps:     { bg: colors.energyLight, fg: colors.energy },
  quadriceps:  { bg: colors.amberLight,  fg: colors.amber  },
  hamstrings:  { bg: colors.amberLight,  fg: colors.amber  },
  glutes:      { bg: colors.mintLight,   fg: colors.mint   },
  core:        { bg: colors.brandLight,  fg: colors.brand  },
  calves:      { bg: colors.skyLight,    fg: colors.sky    },
  full_body:   { bg: colors.amberLight,  fg: colors.amber  },
};

const INTENSITY_COLORS: Record<WorkoutIntensity, { bg: string; fg: string }> = {
  light:  { bg: colors.mintLight,   fg: colors.mint   },
  medium: { bg: colors.brandLight,  fg: colors.brand  },
  high:   { bg: colors.energyLight, fg: colors.energy },
};

function ExerciseCard({
  exercise,
  onToggle,
}: {
  exercise: WorkoutExercise;
  onToggle: () => void;
}) {
  const { t } = useTranslation('common');
  const primaryMuscle = exercise.muscleGroups[0];
  const muscleColor =
    MUSCLE_COLOR_MAP[primaryMuscle] ?? { bg: colors.bg, fg: colors.muted };

  return (
    <Pressable
      onPress={onToggle}
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.card,
        overflow: 'hidden',
        boxShadow: shadows.soft,
        borderCurve: 'continuous',
      } as any}
    >
      {/* muscle accent bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: muscleColor.fg,
          opacity: exercise.done ? 0.25 : 1,
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 20,
          paddingRight: 16,
          paddingVertical: 16,
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.ink,
              opacity: exercise.done ? 0.35 : 1,
            }}
          >
            {t(exercise.nameKey)}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {t('workout.detail.setsRepsLabel', {
                sets: exercise.sets,
                reps: exercise.reps,
              })}
            </Text>
            <Text style={{ fontSize: 12, color: colors.border }}>·</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {t('workout.detail.restLabel', { sec: exercise.restSec })}
            </Text>

            <View
              style={{
                backgroundColor: muscleColor.bg,
                borderRadius: radii.pill,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: muscleColor.fg }}>
                {t(`workout.program.muscleGroups.${primaryMuscle}`)}
              </Text>
            </View>
          </View>
        </View>

        {/* completion toggle */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: exercise.done ? colors.mint : colors.bg,
            borderWidth: exercise.done ? 0 : 1.5,
            borderColor: colors.border,
          }}
        >
          {exercise.done && (
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>✓</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function WorkoutDetailScreen() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { weekDayIndex } = useLocalSearchParams<{ weekDayIndex: string }>();
  const program = useWorkoutProgram();

  const day = program.days[parseInt(weekDayIndex ?? '0', 10)];
  const intensity = INTENSITY_COLORS[day?.intensity ?? 'medium'];

  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    day?.exercises ?? [],
  );

  if (!day || day.isRestDay) return null;

  const doneCount = exercises.filter((e) => e.done).length;
  const allDone = doneCount === exercises.length && exercises.length > 0;

  function toggleExercise(exerciseId: string) {
    setExercises((prev) =>
      prev.map((e) => (e.exerciseId === exerciseId ? { ...e, done: !e.done } : e)),
    );
  }

  function toggleAll() {
    setExercises((prev) => prev.map((e) => ({ ...e, done: !allDone })));
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back button ── */}
      <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-start', marginBottom: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.brand }}>
          ‹ {t('onboarding.back')}
        </Text>
      </Pressable>

      {/* ── Header Card ── */}
      <Card style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.muted,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {t('workout.detail.header')}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>
            {t(day.nameKey)}
          </Text>
        </View>

        {/* chips row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              backgroundColor: colors.brandLight,
              borderRadius: radii.pill,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 13 }}>⏱</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand }}>
              {t('workout.detail.durationLabel', { min: day.durationMin })}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: intensity.bg,
              borderRadius: radii.pill,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: intensity.fg }}>
              {t(`workout.detail.intensityLabel.${day.intensity}`)}
            </Text>
          </View>
        </View>

        {/* progress bar */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {t('workout.completedLabel')}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
              {doneCount}/{exercises.length}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: 100,
              backgroundColor: colors.brandLight,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: exercises.length > 0
                  ? (`${(doneCount / exercises.length) * 100}%` as any)
                  : '0%',
                height: '100%',
                borderRadius: 100,
                backgroundColor: colors.brand,
              }}
            />
          </View>
        </View>
      </Card>

      {/* ── Exercise List ── */}
      <View style={{ gap: 10 }}>
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.exerciseId}
            exercise={ex}
            onToggle={() => toggleExercise(ex.exerciseId)}
          />
        ))}
      </View>

      {/* ── CTA ── */}
      <PillButton
        label={allDone ? t('workout.detail.allDone') : t('workout.detail.markComplete')}
        size="lg"
        variant={allDone ? 'outline' : 'filled'}
        onPress={toggleAll}
      />
    </ScrollView>
  );
}
