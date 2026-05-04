import React from "react";
import { View, Text, Pressable } from "react-native";
import { colors } from "../../design/tokens";

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 17, fontWeight: "700", color: colors.ink }}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.brand }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
