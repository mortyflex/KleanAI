import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card } from '../../src/components/ui/card';
import { colors, radii, shadows } from '../../src/design/tokens';
import { useWorkoutProgram } from '../../src/features/workout/hooks/useWorkoutProgram';
import type { WorkoutDay, MuscleGroup } from '../../src/types/workout.types';

const INTENSITY_COLORS = {
  light:  { bg: colors.mintLight,   fg: colors.mint   },
  medium: { bg: colors.brandLight,  fg: colors.brand  },
  high:   { bg: colors.energyLight, fg: colors.energy },
};

const MAX_FOCUS_CHIPS = 3;

function FocusChip({ group }: { group: MuscleGroup }) {
  const { t } = useTranslation('common');
  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: radii.pill,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>
        {t(`workout.program.muscleGroups.${group}`)}
      </Text>
    </View>
  );
}

function WorkoutDayCard({ day, onPress }: { day: WorkoutDay; onPress: () => void }) {
  const { t } = useTranslation('common');
  const intensity = INTENSITY_COLORS[day.intensity];
  const shownFocus = day.focus.slice(0, MAX_FOCUS_CHIPS);

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.card,
        overflow: 'hidden',
        boxShadow: shadows.soft,
        borderCurve: 'continuous',
      } as any}
    >
      {/* intensity accent bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: intensity.fg,
        }}
      />

      <View style={{ paddingLeft: 20, paddingRight: 16, paddingVertical: 16, gap: 8 }}>
        {/* row 1: weekday label + day name + arrow */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              backgroundColor: intensity.bg,
              borderRadius: radii.chip,
              paddingHorizontal: 8,
              paddingVertical: 4,
              minWidth: 36,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: intensity.fg }}>
              {t(`workout.program.weekdays.${day.weekDayIndex}`)}
            </Text>
          </View>

          <Text
            style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink }}
            numberOfLines={1}
          >
            {t(day.nameKey)}
          </Text>

          <Text style={{ fontSize: 18, color: colors.brand }}>›</Text>
        </View>

        {/* row 2: focus chips */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {shownFocus.map((g) => (
            <FocusChip key={g} group={g} />
          ))}
          {day.focus.length > MAX_FOCUS_CHIPS && (
            <View
              style={{
                backgroundColor: colors.bg,
                borderRadius: radii.pill,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>
                +{day.focus.length - MAX_FOCUS_CHIPS}
              </Text>
            </View>
          )}
        </View>

        {/* row 3: stats */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {t('workout.program.exercises', { count: day.exercises.length })}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>·</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {t('workout.detail.durationLabel', { min: day.durationMin })}
          </Text>
          <View
            style={{
              backgroundColor: intensity.bg,
              borderRadius: radii.pill,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginLeft: 'auto',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: intensity.fg }}>
              {t(`workout.detail.intensityLabel.${day.intensity}`)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function RestDayCard({ day }: { day: WorkoutDay }) {
  const { t } = useTranslation('common');
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.card,
        borderCurve: 'continuous',
        opacity: 0.5,
      } as any}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14 }}>
        <View
          style={{
            backgroundColor: colors.bg,
            borderRadius: radii.chip,
            paddingHorizontal: 8,
            paddingVertical: 4,
            minWidth: 36,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted }}>
            {t(`workout.program.weekdays.${day.weekDayIndex}`)}
          </Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.muted }}>
          {t('workout.program.restDay')}
        </Text>
      </View>
    </View>
  );
}

export default function WorkoutProgramOverview() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const program = useWorkoutProgram();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Program Header Card ── */}
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
            {t('workout.program.title')}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>
            {t(program.nameKey)}
          </Text>
        </View>

        {/* week progress */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {t('workout.program.weekOf', {
                current: program.currentWeek,
                total: program.durationWeeks,
              })}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand }}>
              {Math.round((program.currentWeek / program.durationWeeks) * 100)}%
            </Text>
          </View>
          <View
            style={{
              height: 6,
              borderRadius: 100,
              backgroundColor: colors.brandLight,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${(program.currentWeek / program.durationWeeks) * 100}%` as any,
                height: '100%',
                borderRadius: 100,
                backgroundColor: colors.brand,
              }}
            />
          </View>
        </View>
      </Card>

      {/* ── Weekly Day Cards ── */}
      <View style={{ gap: 10 }}>
        {program.days.map((day) =>
          day.isRestDay ? (
            <RestDayCard key={day.id} day={day} />
          ) : (
            <WorkoutDayCard
              key={day.id}
              day={day}
              onPress={() => router.push(`/workout/${day.weekDayIndex}` as any)}
            />
          ),
        )}
      </View>
    </ScrollView>
  );
}
