import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../../theme';

/**
 * Pill badge — mirrors ShadCN's <Badge> variants.
 * variant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline'
 */
export default function Badge({ label, variant = 'default', color, style }) {
  const bg   = color ? color + '20' : variantBg[variant];
  const text = color ? color       : variantText[variant];

  return (
    <View style={[S.pill, { backgroundColor: bg }, variant === 'outline' && { borderColor: text }, style]}>
      <Text style={[S.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const variantBg = {
  default:     colors.violetTint2,
  secondary:   '#F1F5F9',
  success:     colors.successLight,
  destructive: colors.errorLight,
  outline:     'transparent',
};

const variantText = {
  default:     colors.violet,
  secondary:   colors.textSecondary,
  success:     colors.success,
  destructive: colors.error,
  outline:     colors.textMuted,
};

const S = StyleSheet.create({
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    ...typography.captionBold,
  },
});
