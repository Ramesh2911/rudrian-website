import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Card } from '../components/Card';
import { Loader } from '../components/Loader';
import { StatCard } from '../components/StatCard';
import { getErrorMessage } from '../utils/format';
import { getCoordinates } from '../utils/location';
import { submitPunch } from '../net/actions';
import { riderApi } from '../api/rider';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { colors, radius, spacing, typography } from '../theme';
import type { AttendanceToday, RiderStats } from '../types';
import { formatTime } from '../utils/format';

export function PunchScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { show } = useToast();

  const [attendance, setAttendance] = useState<AttendanceToday | null>(null);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);

  const load = useCallback(async () => {
    try {
      const profile = await riderApi.profile();
      setAttendance(profile.attendanceToday);
      setStats(profile.stats);
    } catch {
      // Keep last known attendance if the request fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onPunch = useCallback(async () => {
    if (punching) return;
    const action = attendance?.action === 'IN' ? 'OUT' : 'IN';
    try {
      setPunching(true);
      const coordinates = await getCoordinates();
      const outcome = await submitPunch(action, coordinates);
      show(
        outcome === 'SYNCED'
          ? `Punch ${action === 'IN' ? 'in' : 'out'} recorded.`
          : 'Punch saved offline. It will sync automatically.',
        outcome === 'SYNCED' ? 'success' : 'info',
      );
      await load();
    } catch (punchError) {
      show(getErrorMessage(punchError), 'error');
    } finally {
      setPunching(false);
    }
  }, [attendance, load, punching, show]);

  if (loading) {
    return <Loader fullScreen label="Loading attendance..." />;
  }

  const onShift = attendance?.action === 'IN';
  const punchLabel = onShift ? 'Punch Out' : 'Punch In';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>
          {user?.location?.name ? `${user.location.name} · ` : ''}Daily punch in and out
        </Text>

        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.heroLabel}>Current status</Text>
              <Text style={styles.heroStatus}>
                {!attendance ? 'Not punched in' : onShift ? 'On shift' : 'Shift completed'}
              </Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: onShift ? colors.success : colors.white }]} />
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeCell}>
              <Text style={styles.timeLabel}>In</Text>
              <Text style={styles.timeValue}>{formatTime(attendance?.inTime)}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeCell}>
              <Text style={styles.timeLabel}>Out</Text>
              <Text style={styles.timeValue}>{formatTime(attendance?.outTime)}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => void onPunch()}
            disabled={punching}
            testID="punch-button"
            accessibilityRole="button"
            accessibilityLabel={punchLabel}
            style={({ pressed }) => [styles.punchBtn, pressed ? styles.pressed : null]}
          >
            <Ionicons name="finger-print" size={20} color={colors.primary} />
            <Text style={styles.punchBtnText}>{punching ? 'Recording...' : punchLabel}</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.statsRow}>
          <StatCard
            icon="cube-outline"
            value={stats?.deliveredToday ?? 0}
            label="Delivered today"
            tone="success"
          />
          <View style={styles.statSpacer} />
          <StatCard
            icon="archive-outline"
            value={stats?.pickedToday ?? 0}
            label="Picked today"
            tone="violet"
          />
        </View>

        <Card style={styles.weekCard}>
          <View style={styles.weekRow}>
            <View style={styles.weekIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.weekTextWrap}>
              <Text style={styles.weekTitle}>Completed this week</Text>
              <Text style={styles.weekSubtitle}>
                {stats?.completedThisWeek ?? 0} deliveries and pickups closed
              </Text>
            </View>
            <Text style={styles.weekValue}>{stats?.completedThisWeek ?? 0}</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  hero: {
    borderRadius: radius.card,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroStatus: {
    ...typography.h1,
    color: colors.white,
    marginTop: 4,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.control,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  timeCell: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  timeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  timeValue: {
    ...typography.title,
    color: colors.white,
    marginTop: 2,
  },
  punchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.control,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.lg,
  },
  punchBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  statSpacer: {
    width: spacing.md,
  },
  weekCard: {
    marginBottom: spacing.lg,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  weekTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  weekTitle: {
    ...typography.bodyStrong,
  },
  weekSubtitle: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 1,
  },
  weekValue: {
    ...typography.h1,
    color: colors.primary,
  },
});
