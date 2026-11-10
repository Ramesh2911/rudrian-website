import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Card } from '../components/Card';
import { Loader } from '../components/Loader';
import { getErrorMessage } from '../utils/format';
import { getCoordinates } from '../utils/location';
import { submitPunch } from '../net/actions';
import { riderApi } from '../api/rider';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { colors, gradients, radius, spacing, typography } from '../theme';
import type { AttendanceToday, RiderStats } from '../types';
import { formatDuration, formatTime, todayIsoDate } from '../utils/format';

const STATUS_CHIP: Record<string, { label: string; fg: string; bg: string }> = {
  PRESENT: { label: 'Present', fg: colors.success, bg: colors.successBg },
  LATE: { label: 'Late', fg: colors.warning, bg: colors.warningBg },
  HALF_DAY: { label: 'Half day', fg: colors.violet, bg: colors.violetBg },
  ABSENT: { label: 'Absent', fg: colors.danger, bg: colors.dangerBg },
  LEAVE: { label: 'Leave', fg: colors.muted, bg: colors.border },
  WEEK_OFF: { label: 'Week off', fg: colors.muted, bg: colors.border },
};

function shortDate(): string {
  return new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function PunchScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { show } = useToast();

  const [attendance, setAttendance] = useState<AttendanceToday | null>(null);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [tick, setTick] = useState(0);

  const pulse = useRef(new Animated.Value(1)).current;

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

  const onShift = attendance?.action === 'IN';

  useEffect(() => {
    if (!onShift) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [onShift, pulse]);

  useEffect(() => {
    if (!onShift) return;
    const id = setInterval(() => setTick((value) => value + 1), 60_000);
    return () => clearInterval(id);
  }, [onShift]);

  const workedLabel = useMemo(() => {
    if (!attendance?.inTime) return '--:--';
    const start = new Date(attendance.inTime).getTime();
    if (Number.isNaN(start)) return '--:--';
    const end = attendance.outTime ? new Date(attendance.outTime).getTime() : Date.now();
    if (Number.isNaN(end)) return '--:--';
    return formatDuration(end - start);
    // tick forces a refresh every minute while on shift.
  }, [attendance, onShift, tick]);

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

  const punchLabel = onShift ? 'Punch Out' : 'Punch In';
  const statusText = !attendance
    ? 'Not punched in'
    : onShift
      ? 'On shift'
      : 'Shift completed';
  const chip = attendance?.status ? STATUS_CHIP[attendance.status] : undefined;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View pointerEvents="none" style={styles.heroGlowTop} />
          <View pointerEvents="none" style={styles.heroGlowBottom} />

          <View style={styles.heroTop}>
            <View style={styles.heroGreet}>
              <Text style={styles.eyebrow}>ATTENDANCE</Text>
              <View style={styles.statusLine}>
                <Animated.View
                  style={[
                    styles.liveDot,
                    { opacity: onShift ? pulse : 1 },
                    { backgroundColor: onShift ? colors.lime : 'rgba(255,255,255,0.35)' },
                  ]}
                />
                <Text style={styles.heroStatus}>{statusText}</Text>
              </View>
            </View>
            <View style={styles.dateChip}>
              <Ionicons name="calendar-outline" size={12} color={colors.lime} />
              <Text style={styles.dateChipText}>{shortDate()}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {chip ? (
              <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
                <Text style={[styles.statusChipText, { color: chip.fg }]}>{chip.label}</Text>
              </View>
            ) : null}
            {user?.location?.name ? (
              <Text style={styles.metaText} numberOfLines={1}>
                {user.location.name}
              </Text>
            ) : null}
          </View>

          <View style={styles.timeCard}>
            <View style={styles.timeCell}>
              <Text style={styles.timeLabel}>IN</Text>
              <Text style={styles.timeValue}>{formatTime(attendance?.inTime)}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeCell}>
              <Text style={styles.timeLabel}>OUT</Text>
              <Text style={styles.timeValue}>{formatTime(attendance?.outTime)}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeCell}>
              <Text style={styles.timeLabel}>WORKED</Text>
              <Text style={[styles.timeValue, styles.timeValueLime]}>{workedLabel}</Text>
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
            <Ionicons name="finger-print" size={20} color={colors.petrol} />
            <Text style={styles.punchBtnText}>{punching ? 'Recording...' : punchLabel}</Text>
          </Pressable>

          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{stats?.deliveredToday ?? 0}</Text>
              <Text style={styles.statLabel}>DELIVERED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{stats?.pickedToday ?? 0}</Text>
              <Text style={styles.statLabel}>PICKED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{stats?.pendingToday ?? 0}</Text>
              <Text style={styles.statLabel}>PENDING</Text>
            </View>
          </View>
        </LinearGradient>

        <Card style={styles.weekCard}>
          <View style={styles.weekIcon}>
            <Ionicons name="trophy-outline" size={20} color={colors.petrol} />
          </View>
          <View style={styles.weekTextWrap}>
            <Text style={styles.weekTitle}>Completed this week</Text>
            <Text style={styles.weekSubtitle}>
              {stats?.completedWeek ?? 0} deliveries and pickups closed
            </Text>
          </View>
          <View style={styles.weekValueWrap}>
            <Text style={styles.weekValue}>{stats?.completedWeek ?? 0}</Text>
            <Text style={styles.weekValueLabel}>CLOSED</Text>
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
  hero: {
    borderRadius: 24,
    padding: spacing.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#001E2C',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroGlowTop: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -90,
    left: -60,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(44,201,217,0.18)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroGreet: {
    flex: 1,
    marginRight: spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: colors.lime,
    marginBottom: 6,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  heroStatus: {
    ...typography.h1,
    color: colors.white,
    fontSize: 26,
    lineHeight: 32,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    marginTop: 2,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lime,
    marginLeft: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    minHeight: 22,
  },
  statusChip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.70)',
    flex: 1,
  },
  timeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  timeCell: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.60)',
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  timeValueLime: {
    color: colors.lime,
  },
  punchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.control,
    paddingVertical: spacing.md + 2,
    marginBottom: spacing.lg,
    shadowColor: '#001E2C',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  punchBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.petrol,
    marginLeft: spacing.sm,
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 3,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  weekIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
  weekValueWrap: {
    alignItems: 'center',
  },
  weekValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.petrol,
    letterSpacing: -0.5,
  },
  weekValueLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
    marginTop: 1,
  },
});
