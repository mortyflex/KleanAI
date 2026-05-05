import React from "react";
import { View } from "react-native";
import { colors } from "../../design/tokens";
import { KleanText } from "./klean-text";

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
        <KleanText variant="label" color={colors.ink}>{label}</KleanText>
        <KleanText variant="caption" color={colors.muted}>
          {current}/{goal}{unit}
        </KleanText>
      </View>
      <View style={{ height: 7, borderRadius: 100, backgroundColor: trackColor, overflow: "hidden" }}>
        <View style={{ width: `${pct}%` as any, height: "100%", borderRadius: 100, backgroundColor: color }} />
      </View>
    </View>
  );
}
