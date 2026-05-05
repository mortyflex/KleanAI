import React from "react";
import { View, Pressable } from "react-native";
import { colors } from "../../design/tokens";
import { KleanText } from "./klean-text";

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <KleanText variant="h3" color={colors.ink}>
        {title}
      </KleanText>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <KleanText variant="label" color={colors.brand}>
            {action}
          </KleanText>
        </Pressable>
      )}
    </View>
  );
}
