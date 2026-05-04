import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, radii } from '../../../design/tokens';

interface OptionCardProps {
  label: string;
  subtitle?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export function OptionCard({ label, subtitle, emoji, selected, onPress, testID }: OptionCardProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: radii.chip,
        backgroundColor: selected ? colors.brandLight : colors.card,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? colors.brand : colors.border,
        gap: 12,
      }}
    >
      {emoji ? (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: selected ? colors.brandMid : colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: selected ? colors.brand : colors.ink,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: selected ? 0 : 2,
          borderColor: colors.border,
          backgroundColor: selected ? colors.brand : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
