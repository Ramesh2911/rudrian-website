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
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';
import { PendingSyncCard } from '../components/PendingSyncCard';
import { Segmented } from '../components/Segmented';
import { StatCard } from '../components/StatCard';
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
import { colors, radius, spacing, typography } from '../theme';
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
      if (profile) setAttendance(profile.attendanceToday);
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

  const activeTasks = segment === 'deliveries' ? mergedDeliveries : mergedPickups;

  const punchLabel = !attendance
    ? 'Punch In'
    : attendance.action === 'IN'
      ? 'Punch Out'
      : 'Punch In';

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

      <View style={styles.greetRow}>
        <View style={styles.greetText}>
          <Text style={styles.greeting}>
            {greetingForHour()}, {user?.name?.split(' ')[0] ?? 'Rider'}
          </Text>
          <Text style={styles.dateText}>{formatDisplayDate()}</Text>
          {user?.location?.name ? <Text style={styles.centerText}>{user.location.name}</Text> : null}
        </View>
        <Avatar name={user?.name ?? 'Rider'} size={48} />
      </View>

      <PendingSyncCard pendingCount={pending} syncing={syncing} onSyncNow={() => void onSyncNow()} />

      <Card style={styles.punchCard}>
        <View style={styles.punchTop}>
          <View style={styles.punchStatusWrap}>
            <Text style={styles.punchLabel}>Attendance</Text>
            <Text style={styles.punchStatus}>
              {!attendance
                ? 'Not punched in yet'
                : attendance.action === 'IN'
                  ? 'On shift'
                  : 'Shift completed'}
            </Text>
            <Text style={styles.punchTimes}>
              In {formatTime(attendance?.inTime)} · Out {formatTime(attendance?.outTime)}
            </Text>
          </View>
          <View
            style={[
              styles.punchDot,
              {
                backgroundColor:
                  attendance?.action === 'IN' ? colors.success : colors.muted,
              },
            ]}
          />
        </View>
        <Pressable
          onPress={() => void onPunch()}
          disabled={punching}
          testID="punch-button"
          accessibilityRole="button"
          accessibilityLabel={punchLabel}
          style={({ pressed }) => [styles.punchButton, pressed ? styles.pressed : null]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.punchGradient}
          >
            <Ionicons name="finger-print" size={18} color={colors.white} />
            <Text style={styles.punchButtonText}>
              {punching ? 'Recording...' : punchLabel}
            </Text>
          </LinearGradient>
        </Pressable>
      </Card>

      <View style={styles.statsRow}>
        <StatCard
          icon="cube-outline"
          value={deliveredToday}
          label="Delivered today"
          tone="success"
        />
        <View style={styles.statSpacer} />
        <StatCard icon="archive-outline" value={pickedToday} label="Picked today" tone="violet" />
      </View>

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
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  greetText: {
    flex: 1,
    marginRight: spacing.md,
  },
  greeting: {
    ...typography.h1,
  },
  dateText: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  centerText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
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
  punchCard: {
    marginBottom: spacing.lg,
  },
  punchTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  punchStatusWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  punchLabel: {
    ...typography.caption,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  punchStatus: {
    ...typography.title,
    marginTop: 2,
  },
  punchTimes: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  punchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: spacing.sm,
  },
  punchButton: {
    borderRadius: radius.control,
    overflow: 'hidden',
  },
  punchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
  },
  punchButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
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
