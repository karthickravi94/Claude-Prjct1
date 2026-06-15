import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography } from '../theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function AnimatedRow({ month, total, active, pct, delay }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: pct,
        duration: 600,
        delay,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pct]);

  const width = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[S.row, { opacity: fadeAnim }]}>
      <Text style={[S.monthName, active && S.monthActive]}>{month.slice(0, 3)}</Text>
      <View style={S.track}>
        <Animated.View
          style={[
            S.fill,
            { width, backgroundColor: active ? colors.violet : '#C4B5FD' },
          ]}
        />
      </View>
      <Text style={[S.amt, total > 0 && S.amtActive, active && S.amtAccent]}>
        {total > 0 ? `$${total.toFixed(0)}` : '—'}
      </Text>
    </Animated.View>
  );
}

export default function ExpenseTable({ expenses }) {
  const now = new Date();
  const cy  = now.getFullYear();
  const cm  = now.getMonth();

  const rows = MONTHS.map((month, idx) => {
    const total = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === cy && d.getMonth() === idx;
      })
      .reduce((s, e) => s + e.amount, 0);
    return { month, total, idx };
  });

  const max = Math.max(...rows.map(r => r.total), 1);

  return (
    <View>
      {rows.map(({ month, total, idx }, i) => (
        <AnimatedRow
          key={month}
          month={month}
          total={total}
          active={idx === cm}
          pct={total > 0 ? total / max : 0}
          delay={i * 30}
        />
      ))}
    </View>
  );
}

const S = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  monthName:  { ...typography.captionMedium, color: colors.textMuted, width: 32 },
  monthActive:{ ...typography.captionBold, color: colors.violet },
  track: {
    flex: 1, height: 5, backgroundColor: colors.violetTint2,
    borderRadius: 3, marginHorizontal: 10, overflow: 'hidden',
  },
  fill:       { height: 5, borderRadius: 3 },
  amt:        { ...typography.caption, color: colors.textDisabled, width: 52, textAlign: 'right' },
  amtActive:  { ...typography.captionBold, color: colors.textSecondary },
  amtAccent:  { ...typography.captionBold, color: colors.violet },
});
