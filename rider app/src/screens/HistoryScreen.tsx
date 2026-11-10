import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Header } from '../components/Header';
import { Loader } from '../components/Loader';
import { Segmented } from '../components/Segmented';
import { TaskCard } from '../components/TaskCard';
import { getErrorMessage } from '../utils/format';
import { loadRunsheet } from '../storage/cache';
import { mergeTask } from '../storage/localTasks';
import { colors, gradients, radius, spacing, typography } from '../theme';
import type { Task } from '../types';
import {
  formatCod,
  isoDate,
  lastNIsoDates,
  sortTasksByCreatedDesc,
  todayIsoDate,
} from '../utils/format';
import type { HistoryStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<HistoryStackParamList, 'History'>;
type Range = 'today' | 'week' | 'all';
type StatusFilter = 'all' | 'done' | 'pending' | 'failed';

const RANGE_DAYS: Record<Range, number> = { today: 1, week: 7, all: 30 };
const RANGE_LABEL: Record<Range, string> = { today: 'Today', week: 'This week', all: 'Last 30 days' };

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'done', label: 'Done' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

type ListItem =
  | { kind: 'section'; id: string; label: string; count: number }
  | { kind: 'task'; id: string; task: Task };

function dayLabel(key: string): string {
  if (!key) return 'Unknown date';
  const today = todayIsoDate();
  const yesterday = lastNIsoDates(2)[1] ?? '';
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
}

function shortDate(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function HistoryScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();

  const [range, setRange] = useState<Range>('today');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dayByKey, setDayByKey] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const dates = lastNIsoDates(RANGE_DAYS[range]);
      const results = await Promise.allSettled(dates.map((date) => loadRunsheet(date)));
      const fulfilled = results.filter(
        (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof loadRunsheet>>> =>
          result.status === 'fulfilled',
      );

      if (fulfilled.length === 0) {
        const first = results.find((result) => result.status === 'rejected');
        throw first && first.status === 'rejected' ? first.reason : new Error('Unable to load history.');
      }

      const map = new Map<string, Task>();
      const days = new Map<string, string>();
      for (const result of fulfilled) {
        const sheet = result.value.runsheet;
        for (const task of [...sheet.deliveries, ...sheet.pickups]) {
          const merged = mergeTask(task);
          map.set(merged.id, merged);
          days.set(merged.id, sheet.date);
        }
      }
      const sorted = Array.from(map.values()).sort(sortTasksByCreatedDesc);
      setTasks(sorted);
      setDayByKey(days);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const stats = useMemo(() => {
    const total = tasks.length;
    let completed = 0;
    let failed = 0;
    let deliveries = 0;
    let cod = 0;
    for (const task of tasks) {
      if (task.status === 'COMPLETED') completed += 1;
      if (task.status === 'FAILED') failed += 1;
      if (task.type === 'DELIVERY') {
        deliveries += 1;
        if (task.status === 'COMPLETED' && typeof task.codAmount === 'number') {
          cod += task.codAmount;
        }
      }
    }
    const pending = total - completed - failed;
    const pickups = total - deliveries;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, failed, pending, deliveries, pickups, cod, rate };
  }, [tasks]);

  const statusCounts = useMemo(
    () => ({
      all: stats.total,
      done: stats.completed,
      pending: stats.pending,
      failed: stats.failed,
    }),
    [stats],
  );

  const spanLabel = useMemo(() => {
    const dates = lastNIsoDates(RANGE_DAYS[range]);
    const newest = dates[0] ?? todayIsoDate();
    const oldest = dates[dates.length - 1] ?? newest;
    if (range === 'today') return shortDate(newest);
    return `${shortDate(oldest)} – ${shortDate(newest)}`;
  }, [range]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tasks;
    if (status === 'done') list = list.filter((task) => task.status === 'COMPLETED');
    else if (status === 'failed') list = list.filter((task) => task.status === 'FAILED');
    else if (status === 'pending') {
      list = list.filter(
        (task) => task.status === 'PENDING' || task.status === 'IN_PROGRESS',
      );
    }
    if (q) {
      list = list.filter((task) => {
        const party = task.type === 'DELIVERY' ? task.receiver : task.sender;
        return (
          task.awbNumber.toLowerCase().includes(q) ||
          (party?.name ?? '').toLowerCase().includes(q)
        );
      });
    }

    const counts = new Map<string, number>();
    for (const task of list) {
      const key = dayByKey.get(task.id) ?? isoDate(new Date(task.createdAt)) ?? '';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const out: ListItem[] = [];
    let currentKey: string | null = null;
    for (const task of list) {
      const key = dayByKey.get(task.id) ?? isoDate(new Date(task.createdAt)) ?? '';
      if (key !== currentKey) {
        currentKey = key;
        out.push({
          kind: 'section',
          id: `section_${key}`,
          label: dayLabel(key),
          count: counts.get(key) ?? 0,
        });
      }
      out.push({ kind: 'task', id: task.id, task });
    }
    return out;
  }, [query, status, tasks, dayByKey]);

  const header = (
    <View>
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
            <Text style={styles.eyebrow}>ACTIVITY</Text>
            <Text style={styles.heroTitle}>{RANGE_LABEL[range]}</Text>
          </View>
          <View style={styles.spanChip}>
            <Ionicons name="calendar-outline" size={12} color={colors.lime} />
            <Text style={styles.spanChipText}>{spanLabel}</Text>
          </View>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>DONE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, stats.failed > 0 ? styles.statValueDanger : null]}>
              {stats.failed}
            </Text>
            <Text style={styles.statLabel}>FAILED</Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHead}>
            <Text style={styles.progressLabel}>Completion rate</Text>
            <Text style={styles.progressPct}>{stats.rate}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${stats.rate}%` as `${number}%` }]}
            />
          </View>
          <Text style={styles.progressSub}>
            {stats.completed} of {stats.total} task{stats.total === 1 ? '' : 's'} closed
          </Text>
        </View>

        <View style={styles.heroFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="cube-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.footerText}>{stats.deliveries} deliveries</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="archive-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.footerText}>{stats.pickups} pickups</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.footerText}>COD {formatCod(stats.cod)}</Text>
          </View>
        </View>
      </LinearGradient>

      <Card style={styles.searchCard}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by AWB or customer name"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.searchInput}
          testID="history-search"
          accessibilityLabel="Search tasks"
        />
        {query.length > 0 ? (
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.muted}
            onPress={() => setQuery('')}
          />
        ) : null}
      </Card>

      <Segmented<Range>
        testID="history-segmented"
        value={range}
        onChange={(next) => {
          setRange(next);
          setLoading(true);
        }}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This week' },
          { value: 'all', label: 'All' },
        ]}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {STATUS_OPTIONS.map((option) => {
          const active = option.value === status;
          const count = statusCounts[option.value];
          return (
            <PressableChip
              key={option.value}
              label={option.label}
              count={count}
              active={active}
              onPress={() => setStatus(option.value)}
              testID={`history-status-${option.value}`}
            />
          );
        })}
      </ScrollView>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <Header title="History" subtitle={RANGE_LABEL[range]} />
        <Loader label="Loading history..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <Header title="History" subtitle={RANGE_LABEL[range]} />
        <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <Header
        title="History"
        subtitle={
          loading
            ? RANGE_LABEL[range]
            : `${stats.total} task${stats.total === 1 ? '' : 's'} · ${RANGE_LABEL[range]}`
        }
      />

      <FlatList
        testID="history-list"
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) =>
          item.kind === 'section' ? (
            <View style={styles.sectionRow} testID={`section-${item.id}`}>
              <Text style={styles.sectionLabel}>{item.label}</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{item.count}</Text>
              </View>
            </View>
          ) : (
            <TaskCard
              task={item.task}
              onPress={(task) => navigation.navigate('TaskDetail', { taskId: task.id, task })}
            />
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title={query || status !== 'all' ? 'No matching tasks' : 'No tasks in this period'}
            subtitle={
              query || status !== 'all'
                ? 'Try a different filter, AWB number or customer name.'
                : 'Tasks you work on will be listed here for quick reference.'
            }
          />
        }
      />
    </View>
  );
}

interface ChipProps {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  testID?: string;
}

function PressableChip({ label, count, active, onPress, testID }: ChipProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count}`}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : null,
        pressed ? styles.chipPressed : null,
      ]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
        {label} ({count})
      </Text>
    </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
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
    marginBottom: 3,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.white,
    fontSize: 24,
    lineHeight: 30,
  },
  spanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
  },
  spanChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lime,
    marginLeft: spacing.xs,
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
  statValueDanger: {
    color: '#FFB4A8',
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
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    paddingTop: spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.78)',
    marginLeft: 5,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: spacing.sm,
    color: colors.ink,
    fontSize: 15,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
  },
  chipsScroll: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    paddingHorizontal: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.petrol,
    borderColor: colors.petrol,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.body,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: colors.primary50,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
});
