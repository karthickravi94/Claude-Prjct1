import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Wraps children in a fade + slide-up entrance animation.
 * Plays once on mount; re-keys with `trigger` to replay.
 */
export default function FadeSlideIn({ children, delay = 0, dy = 18, duration = 380, style, trigger }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [trigger]);

  return (
    <Animated.View
      style={[
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
