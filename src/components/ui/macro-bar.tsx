import React from "react";
import { View, Text } from "react-native";
import { colors } from "../../design/tokens";

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  trackColor: string;
}

export function MacroBar({ label, current, goal, unit, color, trackColor }: MacroBarProps) {
  const pct = Math.min(Math.round((current / goal) * 100), 100);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          {current}/{goal}{unit}
        </Text>
      </View>
      <View style={{ height: 7, borderRadius: 100, backgroundColor: trackColor, overflow: "hidden" }}>
        <View style={{ width: `${pct}%` as any, height: "100%", borderRadius: 100, backgroundColor: color }} />
      </View>
    </View>
  );
}
