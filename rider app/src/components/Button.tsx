import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  md: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
};

const textStyles: Record<ButtonSize, { fontSize: number }> = {
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 16 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  testID,
  accessibilityLabel,
}: ButtonProps): React.JSX.Element {
  const inactive = disabled || loading;
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? colors.white
      : variant === 'ghost'
        ? colors.primary
        : colors.primary;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            style={[
              styles.label,
              { fontSize: textStyles[size].fontSize, color: textColor },
              variant === 'outline' ? styles.outlineLabel : null,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  const baseStyle: ViewStyle = {
    ...sizeStyles[size],
    borderRadius: radius.control,
    opacity: inactive ? 0.6 : 1,
  };

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [style, pressed && !inactive ? styles.pressed : null]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, baseStyle]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.base,
            baseStyle,
            variant === 'outline'
              ? { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.primary }
              : null,
            variant === 'ghost' ? { backgroundColor: 'transparent' } : null,
            variant === 'danger' ? { backgroundColor: colors.danger } : null,
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodyStrong,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  outlineLabel: {
    color: colors.primary,
  },
  icon: {
    marginRight: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
