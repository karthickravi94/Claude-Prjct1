import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, shadows, radius } from '../../theme';

/**
 * ShadCN-style card: white surface, 1px border, soft shadow, rounded-2xl.
 * elevation prop: 'none' | 'sm' | 'md' | 'lg'
 */
export default function Card({ children, style, elevation = 'md', noPadding = false }) {
  return (
    <View style={[S.card, shadows[elevation] || {}, noPadding && S.noPadding, style]}>
      {children}
    </View>
  );
}

const S = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noPadding: {
    padding: 0,
  },
});
