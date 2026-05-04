import React from "react";
import { Pressable, Text, PressableProps, ViewStyle } from "react-native";
import { colors, radii, shadows } from "../../design/tokens";

interface PillButtonProps extends PressableProps {
  label: string;
  variant?: "filled" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const paddings: Record<string, { paddingHorizontal: number; paddingVertical: number }> = {
  sm: { paddingHorizontal: 16, paddingVertical: 8 },
  md: { paddingHorizontal: 20, paddingVertical: 14 },
  lg: { paddingHorizontal: 24, paddingVertical: 18 },
};

const fontSizes: Record<string, number> = { sm: 13, md: 15, lg: 15 };

export function PillButton({ label, variant = "filled", size = "md", style, ...props }: PillButtonProps) {
  const isFilled = variant === "filled";
  const isOutline = variant === "outline";

  const containerStyle: ViewStyle = {
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isFilled ? colors.brand : colors.card,
    borderWidth: isOutline ? 1.5 : 0,
    borderColor: isOutline ? colors.border : undefined,
    ...paddings[size],
    ...(isFilled ? { boxShadow: shadows.brand } : {}),
  } as any;

  return (
    <Pressable style={[containerStyle, style as any]} {...props}>
      <Text
        style={{
          fontSize: fontSizes[size],
          fontWeight: "600",
          color: isFilled ? "#FFFFFF" : isOutline ? colors.ink : colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function FilterPill({ label, active, onPress }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radii.pill,
        backgroundColor: active ? colors.ink : colors.card,
        borderWidth: active ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: active ? "#FFFFFF" : colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
