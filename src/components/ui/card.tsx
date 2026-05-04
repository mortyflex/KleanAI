import React from "react";
import { View, ViewProps } from "react-native";
import { colors, radii, shadows } from "../../design/tokens";

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.card,
          padding: 20,
          boxShadow: shadows.card,
          borderCurve: "continuous",
        } as any,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
