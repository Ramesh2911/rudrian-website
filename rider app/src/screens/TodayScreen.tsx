import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';
import { PendingSyncCard } from '../components/PendingSyncCard';
import { Segmented } from '../components/Segmented';
import { TaskCard } from '../components/TaskCard';
import { getErrorMessage } from '../utils/format';
import { getCoordinates } from '../utils/location';
import { submitPunch } from '../net/actions';
import { getPendingOutboxCount, syncOutbox } from '../net/sync';
import { useOnline } from '../net/useOnline';
import { riderApi } from '../api/rider';
import { loadRunsheet } from '../storage/cache';
import { mergeTask } from '../storage/localTasks';
import { useAuth } from '../state/AuthContext';
import { useSocket } from '../state/SocketContext';
import { useToast } from '../state/ToastContext';
import { colors, gradients, radius, spacing, typography } from '../theme';
import type { AttendanceToday, Task } from '../types';
import { formatDisplayDate, formatTime, greetingForHour, todayIsoDate } from '../utils/format';
import type { TodayStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<TodayStackParamList, 'Today'>;

type Segment = 'deliveries' | 'pickups';

export function TodayScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { show } = useToast();
  const { taskEvent, clearTaskEvent } = useSocket();
  const online = useOnline();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Task[]>([]);
  const [pickups, setPickups] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<AttendanceToday | null>(null);
  const [weekDone, setWeekDone] = useState<number | null>(null);
  const [segment, setSegment] = useState<Segment>('deliveries');
  const [punching, setPunching] = useState(false);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [liveBanner, setLiveBanner] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [sheet, profile] = await Promise.all([
        loadRunsheet(todayIsoDate()),
        riderApi.profile().catch(() => null),
      ]);
      setDeliveries(sheet.runsheet.deliveries ?? []);
      setPickups(sheet.runsheet.pickups ?? []);
      if (profile) {
        setAttendance(profile.attendanceToday);
        setWeekDone(profile.stats?.completedWeek ?? null);
      }
      setPending(await getPendingOutboxCount());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  React.useEffect(() => {
    if (!taskEvent) return;
    void load(true);
    setLiveBanner(true);
    clearTaskEvent();
  }, [taskEvent, load, clearTaskEvent]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(true);
  }, [load]);

  const onPunch = useCallback(async () => {
    if (punching) return;
    const nextAction = attendance?.action === 'IN' ? 'OUT' : 'IN';
    try {
      setPunching(true);
      const coordinates = await getCoordinates();
      const outcome = await submitPunch(nextAction, coordinates);
      show(
        outcome === 'SYNCED'
          ? `Punch ${nextAction === 'IN' ? 'in' : 'out'} recorded.`
          : 'Punch saved offline. It will sync when you are back online.',
        outcome === 'SYNCED' ? 'success' : 'info',
      );
      await load(true);
    } catch (punchError) {
      show(getErrorMessage(punchError), 'error');
    } finally {
      setPunching(false);
    }
  }, [attendance, load, punching, show]);

  const onSyncNow = useCallback(async () => {
    try {
      setSyncing(true);
      const summary = await syncOutbox({ force: true });
      setPending(summary.pending);
      show(
        summary.synced > 0
          ? `${summary.synced} offline action${summary.synced === 1 ? '' : 's'} synced.`
          : summary.skipped
            ? 'Sync will retry when the connection improves.'
            : 'Nothing could be synced right now.',
        summary.synced > 0 ? 'success' : 'info',
      );
      if (summary.synced > 0) void load(true);
    } finally {
      setSyncing(false);
    }
  }, [load, show]);

  const mergedDeliveries = useMemo(() => deliveries.map(mergeTask), [deliveries]);
  const mergedPickups = useMemo(() => pickups.map(mergeTask), [pickups]);

  const deliveredToday = useMemo(
    () => mergedDeliveries.filter((task) => task.status === 'COMPLETED').length,
    [mergedDeliveries],
  );
  const pickedToday = useMemo(
    () => mergedPickups.filter((task) => task.status === 'COMPLETED').length,
    [mergedPickups],
  );

  const totalTasks = mergedDeliveries.length + mergedPickups.length;
  const doneToday = deliveredToday + pickedToday;
  const progressPct = totalTasks > 0 ? Math.round(Math.min(1, doneToday / totalTasks) * 100) : 0;

  const activeTasks = segment === 'deliveries' ? mergedDeliveries : mergedPickups;

  const punchLabel = !attendance
    ? 'Punch In'
    : attendance.action === 'IN'
      ? 'Punch Out'
      : 'Punch In';

  const attendanceStatus = !attendance
    ? 'Not punched in yet'
    : attendance.action === 'IN'
      ? 'On shift'
      : 'Shift completed';

  const header = (
    <View>
      {liveBanner ? (
        <Pressable
          style={styles.liveBanner}
          onPress={() => setLiveBanner(false)}
          accessibilityRole="alert"
          accessibilityLabel="New task assigned"
        >
          <Ionicons name="notifications-outline" size={16} color={colors.primary} />
          <Text style={styles.liveBannerText} numberOfLines={1}>
            New task assigned. Your run sheet is up to date.
          </Text>
          <Ionicons name="close" size={16} color={colors.primary} />
        </Pressable>
      ) : null}

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
            <Text style={styles.greeting}>
              {greetingForHour()}, {user?.name?.split(' ')[0] ?? 'Rider'}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.dateText}>{formatDisplayDate()}</Text>
              {user?.location?.name ? (
                <View style={styles.centerChip}>
                  <Text style={styles.centerChipText} numberOfLines={1}>
                    {user.location.name}
                  </Text>
                </View>
              ) : null}
              <View style={styles.onlineChip}>
                <View
                  style={[
                    styles.onlineDot,
                    { backgroundColor: online ? colors.lime : colors.warning },
                  ]}
                />
                <Text style={styles.onlineText}>{online ? 'Live' : 'Offline'}</Text>
              </View>
            </View>
          </View>
          <Avatar name={user?.name ?? 'Rider'} size={52} />
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{deliveredToday}</Text>
            <Text style={styles.statLabel}>DELIVERED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{pickedToday}</Text>
            <Text style={styles.statLabel}>PICKED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{weekDone ?? '—'}</Text>
            <Text style={styles.statLabel}>THIS WEEK</Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHead}>
            <Text style={styles.progressLabel}>Today&apos;s progress</Text>
            <Text style={styles.progressPct}>{progressPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPct}%` as `${number}%` }]}
            />
          </View>
          <Text style={styles.progressSub}>
            {doneToday} of {totalTasks} task{totalTasks === 1 ? '' : 's'} completed
          </Text>
        </View>

        <View style={styles.attendRow}>
          <View style={styles.attendLeft}>
            <View
              style={[
                styles.attendDot,
                {
                  backgroundColor:
                    attendance?.action === 'IN' ? colors.lime : 'rgba(255,255,255,0.35)',
                },
              ]}
            />
            <Text style={styles.attendStatus}>{attendanceStatus}</Text>
          </View>
          <Text style={styles.attendTimes}>
            In {formatTime(attendance?.inTime)} · Out {formatTime(attendance?.outTime)}
          </Text>
        </View>

        <Pressable
          onPress={() => void onPunch()}
          disabled={punching}
          testID="punch-button"
          accessibilityRole="button"
          accessibilityLabel={punchLabel}
          style={({ pressed }) => [styles.punchBtn, pressed ? styles.pressed : null]}
        >
          <Ionicons name="finger-print" size={18} color={colors.petrol} />
          <Text style={styles.punchBtnText}>
            {punching ? 'Recording...' : punchLabel}
          </Text>
        </Pressable>
      </LinearGradient>

      <PendingSyncCard pendingCount={pending} syncing={syncing} onSyncNow={() => void onSyncNow()} />

      <Segmented<Segment>
        testID="today-segmented"
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'deliveries', label: 'Deliveries', count: mergedDeliveries.length },
          { value: 'pickups', label: 'Pickups', count: mergedPickups.length },
        ]}
      />

      <Text style={styles.listTitle}>
        {segment === 'deliveries' ? 'Delivery run sheet' : 'Pickup run sheet'}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return <Loader fullScreen label="Loading your run sheet..." />;
  }

  if (error && activeTasks.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
        <ErrorState message={error} onRetry={() => void load()} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <FlatList
        testID="today-list"
        data={activeTasks}
        keyExtractor={(task) => task.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={(task) => navigation.navigate('TaskDetail', { taskId: task.id, task })} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={segment === 'deliveries' ? 'cube-outline' : 'archive-outline'}
            title={segment === 'deliveries' ? 'No deliveries today' : 'No pickups today'}
            subtitle={
              online
                ? 'New assignments from dispatch will appear here automatically.'
                : 'We could not reach the server. Pull to refresh once you are online.'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary50,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  liveBannerText: {
    ...typography.label,
    color: colors.primary,
    flex: 1,
    marginHorizontal: spacing.sm,
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
    bottom: -80,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(44,201,217,0.18)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  heroGreet: {
    flex: 1,
    marginRight: spacing.md,
  },
  greeting: {
    ...typography.h1,
    color: colors.white,
    fontSize: 24,
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  dateText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.72)',
  },
  centerChip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    marginLeft: spacing.sm,
    maxWidth: 140,
  },
  centerChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lime,
  },
  onlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
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
    fontSize: 26,
    lineHeight: 30,
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
  progressBlock: {
    marginBottom: spacing.lg,
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.lime,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  progressSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: spacing.sm,
  },
  attendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  attendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  attendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  attendStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.90)',
  },
  attendTimes: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  punchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.control,
    paddingVertical: spacing.md + 2,
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
  listTitle: {
    ...typography.label,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    fontWeight: '700',
  },
});
