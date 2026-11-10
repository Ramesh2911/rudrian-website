import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

export interface LoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export function Loader({ label, fullScreen = false }: LoaderProps): React.JSX.Element {
  const content = (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );

  if (fullScreen) {
    return <View style={styles.full}>{content}</View>;
  }
  return content;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  full: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  label: {
    ...typography.label,
    marginTop: spacing.md,
    color: colors.muted,
  },
});
