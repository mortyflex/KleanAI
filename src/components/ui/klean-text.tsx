import React from "react";
import { Text, TextProps, TextStyle, StyleProp } from "react-native";
import { typography, TypographyVariant } from "../../theme/typography";
import { colors } from "../../design/tokens";

export type KleanTextAlign = "left" | "center" | "right" | "justify" | "auto";

export interface KleanTextProps extends Omit<TextProps, "style"> {
  variant?: TypographyVariant;
  color?: string;
  align?: KleanTextAlign;
  weight?: TextStyle["fontWeight"];
  className?: string;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

/**
 * Single text primitive for Klean AI. Always prefer this over raw <Text>
 * with inline fontSize/fontWeight so the typography stays consistent.
 *
 * @example
 *   <KleanText variant="h2" color={colors.ink}>Today's Workout</KleanText>
 *   <KleanText variant="caption" color={colors.muted}>3 sets · 12 reps</KleanText>
 */
export function KleanText({
  variant = "body",
  color = colors.ink,
  align,
  weight,
  className,
  style,
  children,
  ...rest
}: KleanTextProps) {
  const variantStyle = typography[variant];

  const composed: TextStyle = {
    ...variantStyle,
    color,
    ...(align ? { textAlign: align } : {}),
    ...(weight ? { fontWeight: weight } : {}),
  };

  return (
    <Text className={className} style={[composed, style]} {...rest}>
      {children}
    </Text>
  );
}
