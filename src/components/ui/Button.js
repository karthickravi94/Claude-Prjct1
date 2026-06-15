import React, { useRef } from 'react';
import { TouchableOpacity, Text, Animated, ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors, radius, typography, shadows } from '../../theme';

/**
 * ShadCN-inspired button with spring press animation.
 * variant: 'primary' | 'secondary' | 'ghost' | 'destructive'
 * size: 'sm' | 'md' | 'lg'
 */
export default function Button({ onPress, label, variant = 'primary', loading, disabled, size = 'md', style, children }) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60, bounciness: 0 }).start();

  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();

  const isDisabled = disabled || loading;
  const content = children || label;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, isDisabled && S.opacity, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[S.base, S[size]]}
      >
        {variant === 'primary' && (
          <View style={[S.fill, S.primaryBg]}>
            {loading
              ? <ActivityIndicator color="#0f1117" size="small" />
              : <Text style={[S.text, S.textPrimary, size === 'sm' && S.textSm]}>{content}</Text>}
          </View>
        )}

        {variant === 'secondary' && (
          <View style={[S.fill, S.secondaryBg]}>
            <Text style={[S.text, S.textSecondary, size === 'sm' && S.textSm]}>{content}</Text>
          </View>
        )}

        {variant === 'ghost' && (
          <View style={S.fill}>
            <Text style={[S.text, S.textGhost, size === 'sm' && S.textSm]}>{content}</Text>
          </View>
        )}

        {variant === 'destructive' && (
          <View style={[S.fill, S.destructiveBg]}>
            {loading
              ? <ActivityIndicator color="#EF4444" size="small" />
              : <Text style={[S.text, S.textDestructive, size === 'sm' && S.textSm]}>{content}</Text>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  base:           { borderRadius: radius.lg, overflow: 'hidden' },
  fill:           { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  opacity:        { opacity: 0.65 },

  // sizes
  md:             { /* default */ },
  sm:             { borderRadius: radius.md },
  lg:             { borderRadius: radius.xl },

  text:           { ...typography.subtitle, letterSpacing: 0.2 },
  textSm:         { ...typography.captionBold },
  primaryBg:      { backgroundColor: '#00c9a7' },
  textPrimary:    { color: '#0f1117', paddingVertical: 16, paddingHorizontal: 24 },
  textSecondary:  { color: colors.violet, paddingVertical: 16, paddingHorizontal: 24 },
  textGhost:      { color: colors.violet, paddingVertical: 14, paddingHorizontal: 20 },
  textDestructive:{ color: colors.error, paddingVertical: 16, paddingHorizontal: 24 },

  secondaryBg:    { backgroundColor: colors.violetTint2 },
  destructiveBg:  { backgroundColor: colors.errorLight, borderWidth: 1, borderColor: colors.errorBorder },
});
