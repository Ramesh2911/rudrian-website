import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

export interface OfflineBannerProps {
  message?: string;
}

export function OfflineBanner({ message }: OfflineBannerProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top + spacing.xs }]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Changes will sync automatically."
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
      <Text style={styles.text} numberOfLines={1}>
        {message ?? 'You are offline. Changes will sync automatically.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.warning,
    marginLeft: spacing.sm,
  },
});
