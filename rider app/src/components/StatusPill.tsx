import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { TaskStatus } from '../types';

const STATUS_MAP: Record<TaskStatus, { label: string; fg: string; bg: string }> = {
  PENDING: { label: 'Pending', fg: colors.muted, bg: colors.border },
  IN_PROGRESS: { label: 'In progress', fg: colors.primary, bg: colors.primary50 },
  COMPLETED: { label: 'Completed', fg: colors.success, bg: colors.successBg },
  FAILED: { label: 'Failed', fg: colors.danger, bg: colors.dangerBg },
};

export interface StatusPillProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
  testID?: string;
}

export function StatusPill({ status, size = 'md', testID }: StatusPillProps): React.JSX.Element {
  const config = STATUS_MAP[status] ?? STATUS_MAP.PENDING;
  return (
    <View
      testID={testID}
      accessibilityLabel={`Status ${config.label}`}
      style={[
        styles.pill,
        { backgroundColor: config.bg },
        size === 'sm' ? styles.pillSm : styles.pillMd,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.fg }]} />
      <Text style={[styles.text, { color: config.fg }, size === 'sm' ? styles.textSm : null]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  pillMd: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs + 1,
  },
  pillSm: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs + 2,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  textSm: {
    fontSize: 11,
  },
});
