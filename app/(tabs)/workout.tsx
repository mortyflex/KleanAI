import React, { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { workoutPlan } from "../../src/data/mock";
import { Card } from "../../src/components/ui/card";
import { FilterPill, PillButton } from "../../src/components/ui/pill-button";
import { SectionHeader } from "../../src/components/ui/section-header";
import { colors, radii, shadows } from "../../src/design/tokens";

const FILTERS = ["All", "Strength", "Cardio", "Mobility"] as const;
type Filter = (typeof FILTERS)[number];

const MUSCLE_COLORS: Record<string, { bg: string; fg: string }> = {
  Chest:       { bg: colors.energyLight, fg: colors.energy },
  Back:        { bg: colors.skyLight,    fg: colors.sky },
  Shoulders:   { bg: colors.brandLight,  fg: colors.brand },
  Biceps:      { bg: colors.mintLight,   fg: colors.mint },
  Triceps:     { bg: colors.energyLight, fg: colors.energy },
  "Full Body": { bg: colors.amberLight,  fg: colors.amber },
};

function ExerciseCard({ exercise, onToggle }: { exercise: (typeof workoutPlan.exercises)[0]; onToggle: () => void }) {
  const muscle = MUSCLE_COLORS[exercise.muscle] ?? { bg: colors.bg, fg: colors.muted };

  return (
    <Pressable
      onPress={onToggle}
      style={{
        backgroundColor: colors.card,
        borderRadius: radii.card,
        overflow: "hidden",
        boxShadow: shadows.soft,
        borderCurve: "continuous",
      } as any}
    >
      {/* Left accent bar */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: muscle.fg,
          opacity: exercise.done ? 0.25 : 1,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 16, paddingVertical: 16, gap: 12 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink, opacity: exercise.done ? 0.35 : 1 }}>
            {exercise.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {exercise.sets} sets × {exercise.reps} reps
            </Text>
            <View style={{ backgroundColor: muscle.bg, borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: muscle.fg }}>{exercise.muscle}</Text>
            </View>
          </View>
        </View>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: exercise.done ? colors.mint : colors.bg,
            borderWidth: exercise.done ? 0 : 1.5,
            borderColor: colors.border,
          }}
        >
          {exercise.done && (
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>✓</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function WorkoutScreen() {
  const [filter, setFilter] = useState<Filter>("All");
  const [exercises, setExercises] = useState(workoutPlan.exercises);

  const visible = filter === "All" ? exercises : exercises.filter((e) => e.category === filter);
  const doneCount = exercises.filter((e) => e.done).length;
  const allDone = doneCount === exercises.length;

  function toggle(id: string) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e)));
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header Card ── */}
      <Card style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 1, textTransform: "uppercase" }}>
            Today's Workout
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>{workoutPlan.name}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ backgroundColor: colors.brandLight, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 13 }}>⏱</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.brand }}>{workoutPlan.durationMin} min</Text>
          </View>
          <View style={{ backgroundColor: colors.energyLight, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.energy }}>{workoutPlan.intensity}</Text>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>Exercises completed</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>{doneCount}/{exercises.length}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 100, backgroundColor: colors.brandLight, overflow: "hidden" }}>
            <View style={{ width: `${(doneCount / exercises.length) * 100}%` as any, height: "100%", borderRadius: 100, backgroundColor: colors.brand }} />
          </View>
        </View>
      </Card>

      {/* ── Filters ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <FilterPill key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      {/* ── Exercise List ── */}
      <View style={{ gap: 12 }}>
        <SectionHeader title={`${visible.length} exercise${visible.length !== 1 ? "s" : ""}`} />
        {visible.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} onToggle={() => toggle(ex.id)} />
        ))}
      </View>

      {/* ── CTA ── */}
      <PillButton
        label={allDone ? "All Done! 🎉" : "Mark All Complete"}
        size="lg"
        variant={allDone ? "outline" : "filled"}
        onPress={() => setExercises((prev) => prev.map((e) => ({ ...e, done: !allDone })))}
      />
    </ScrollView>
  );
}
