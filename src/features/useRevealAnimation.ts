import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

type Options = {
  /** While true the reveal has not started (data still loading, or the animation is disabled). */
  waiting: boolean;
  /** Value before the first reveal: 0 hides the content, 1 shows it immediately. */
  initial: 0 | 1;
  /** Hide the content again each time `waiting` turns true. */
  resetWhileWaiting?: boolean;
  timing: { duration: number; delay?: number; useNativeDriver: boolean };
  /** Called when the content is fully shown, including when Reduce Motion skips the animation. */
  onShown?: () => void;
};

/**
 * Animates a 0–1 value to 1 once content is ready. With Reduce Motion enabled, unavailable,
 * or switched on mid-animation, the value jumps straight to 1.
 */
export function useRevealAnimation({ waiting, initial, resetWhileWaiting = false, timing, onShown }: Options) {
  const value = useRef(new Animated.Value(initial)).current;
  const shown = useRef(onShown);
  const config = useRef(timing);
  useEffect(() => {
    shown.current = onShown;
    config.current = timing;
  });
  useEffect(() => {
    if (waiting) {
      if (resetWhileWaiting) value.setValue(0);
      return;
    }
    let active = true;
    const reveal = (reduceMotion: boolean) => {
      if (!active) return;
      if (reduceMotion) {
        value.setValue(1);
        shown.current?.();
        return;
      }
      Animated.timing(value, { toValue: 1, ...config.current }).start(({ finished }) => {
        if (active && finished) shown.current?.();
      });
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(reveal, () => reveal(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduceMotion => {
      if (reduceMotion) {
        value.stopAnimation();
        reveal(true);
      }
    });
    return () => {
      active = false;
      value.stopAnimation();
      subscription.remove();
    };
  }, [waiting, resetWhileWaiting, value]);
  return value;
}
