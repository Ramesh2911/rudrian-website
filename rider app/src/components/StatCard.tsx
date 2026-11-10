import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from './Card';
import { colors, spacing, typography } from '../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface StatCardProps {
  icon: IoniconName;
  value: string | number;
  label: string;
  tone?: 'primary' | 'success' | 'violet' | 'warning';
  style?: object;
}

const TONES: Record<NonNullable<StatCardProps['tone']>, { fg: string; bg: string }> = {
  primary: { fg: colors.primary, bg: colors.primary50 },
  success: { fg: colors.success, bg: colors.successBg },
  violet: { fg: colors.violet, bg: colors.violetBg },
  warning: { fg: colors.warning, bg: colors.warningBg },
};

export function StatCard({ icon, value, label, tone = 'primary', style }: StatCardProps): React.JSX.Element {
  const palette = TONES[tone];
  return (
    <Card style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
        <Ionicons name={icon} size={18} color={palette.fg} />
      </View>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  value: {
    ...typography.h1,
  },
  label: {
    ...typography.caption,
    marginTop: 2,
  },
});
