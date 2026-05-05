import React from "react";
import { Pressable, PressableProps, ViewStyle } from "react-native";
import { colors, radii, shadows } from "../../design/tokens";
import { KleanText } from "./klean-text";
import { TypographyVariant } from "../../theme/typography";

interface PillButtonProps extends PressableProps {
  label: string;
  variant?: "filled" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const paddings: Record<
  string,
  { paddingHorizontal: number; paddingVertical: number }
> = {
  sm: { paddingHorizontal: 16, paddingVertical: 10 },
  md: { paddingHorizontal: 20, paddingVertical: 14 },
  lg: { paddingHorizontal: 24, paddingVertical: 18 },
};

const textVariants: Record<string, TypographyVariant> = {
  sm: "label",
  md: "button",
  lg: "button",
};

export function PillButton({
  label,
  variant = "filled",
  size = "md",
  style,
  ...props
}: PillButtonProps) {
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
      <KleanText
        variant={textVariants[size]}
        color={isFilled ? "#FFFFFF" : isOutline ? colors.ink : colors.muted}
      >
        {label}
      </KleanText>
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
        paddingVertical: 10,
        borderRadius: radii.pill,
        backgroundColor: active ? colors.ink : colors.card,
        borderWidth: active ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <KleanText
        variant="label"
        color={active ? "#FFFFFF" : colors.muted}
      >
        {label}
      </KleanText>
    </Pressable>
  );
}
