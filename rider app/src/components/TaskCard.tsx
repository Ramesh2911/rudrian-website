import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StatusPill } from './StatusPill';
import { colors, radius, shadow, spacing, typography } from '../theme';
import type { Task } from '../types';
import { formatCod } from '../utils/format';

export interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
}

export function TaskCard({ task, onPress }: TaskCardProps): React.JSX.Element {
  const party = task.type === 'DELIVERY' ? task.receiver : task.sender;
  const name = party?.name ?? 'Unknown recipient';
  const address = party?.address ?? 'Address pending';
  const showCod = typeof task.codAmount === 'number' && task.codAmount > 0;

  return (
    <Pressable
      onPress={() => onPress(task)}
      testID={`task-card-${task.awbNumber}`}
      accessibilityRole="button"
      accessibilityLabel={`Task ${task.awbNumber}, ${name}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.seqWrap}>
        <Text style={styles.seqText}>{task.sequence}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.awb} numberOfLines={1}>
            {task.awbNumber}
          </Text>
          <StatusPill status={task.status} size="sm" />
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.address} numberOfLines={2}>
          {address}
        </Text>

        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: task.type === 'DELIVERY' ? colors.violetBg : colors.warningBg }]}>
            <Text
              style={[
                styles.badgeText,
                { color: task.type === 'DELIVERY' ? colors.violet : colors.warning },
              ]}
            >
              {task.type === 'DELIVERY' ? 'Delivery' : 'Pickup'}
            </Text>
          </View>
          {showCod ? (
            <View style={[styles.badge, { backgroundColor: colors.dangerBg }]}>
              <Text style={[styles.badgeText, { color: colors.danger }]}>
                COD {formatCod(task.codAmount as number)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
  seqWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  seqText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  body: {
    flex: 1,
    marginRight: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  awb: {
    ...typography.bodyStrong,
    fontFamily: typography.mono,
    letterSpacing: 0.2,
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  address: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
