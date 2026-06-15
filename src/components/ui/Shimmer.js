import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';

export default function Shimmer({ w, h, r = 10, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.38] });

  return (
    <Animated.View
      style={[
        { width: w, height: h, borderRadius: r, backgroundColor: '#C4B5FD', opacity },
        style,
      ]}
    />
  );
}
