import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';
import { colors, radius, spacing, typography } from '../theme';

export interface PendingSyncCardProps {
  pendingCount: number;
  syncing: boolean;
  onSyncNow: () => void;
}

export function PendingSyncCard({ pendingCount, syncing, onSyncNow }: PendingSyncCardProps): React.JSX.Element | null {
  if (pendingCount <= 0) return null;
  return (
    <View style={styles.card} testID="pending-sync-card">
      <View style={styles.iconWrap}>
        <Ionicons name="sync-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>
          {pendingCount} action{pendingCount === 1 ? '' : 's'} pending sync
        </Text>
        <Text style={styles.subtitle}>They will upload automatically when you are back online.</Text>
      </View>
      <Button label="Sync now" size="sm" variant="outline" loading={syncing} onPress={onSyncNow} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary50,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  subtitle: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 1,
  },
});
