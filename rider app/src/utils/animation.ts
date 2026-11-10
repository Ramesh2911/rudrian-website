import { Animated, Easing } from 'react-native';

export function shake(value: Animated.Value, distance: number = 8): void {
  value.setValue(0);
  Animated.sequence([
    Animated.timing(value, { toValue: distance, duration: 60, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    Animated.timing(value, { toValue: -distance, duration: 60, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.timing(value, { toValue: distance * 0.6, duration: 60, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.timing(value, { toValue: 0, duration: 60, easing: Easing.out(Easing.quad), useNativeDriver: true }),
  ]).start();
}
