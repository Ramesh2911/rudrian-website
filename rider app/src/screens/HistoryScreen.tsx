import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
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
import { colors, radius, spacing, typography } from '../theme';
import type { Task } from '../types';
import { lastNIsoDates, sortTasksByCreatedDesc } from '../utils/format';
import type { HistoryStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<HistoryStackParamList, 'History'>;
type Range = 'today' | 'week' | 'all';

const RANGE_DAYS: Record<Range, number> = { today: 1, week: 7, all: 30 };

export function HistoryScreen(): React.JSX.Element {
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();

  const [range, setRange] = useState<Range>('today');
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
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
      for (const result of fulfilled) {
        const sheet = result.value.runsheet;
        for (const task of [...sheet.deliveries, ...sheet.pickups]) {
          map.set(task.id, mergeTask(task));
        }
      }
      const sorted = Array.from(map.values()).sort(sortTasksByCreatedDesc);
      setTasks(sorted);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => {
      const party = task.type === 'DELIVERY' ? task.receiver : task.sender;
      return (
        task.awbNumber.toLowerCase().includes(q) ||
        (party?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [query, tasks]);

  const header = (
    <View>
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
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <Header title="History" subtitle="Completed and recent tasks" />

      {loading && !refreshing ? (
        <Loader label="Loading history..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />
      ) : (
        <FlatList
          testID="history-list"
          data={filtered}
          keyExtractor={(task) => task.id}
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
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={(task) => navigation.navigate('TaskDetail', { taskId: task.id, task })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title={query ? 'No matching tasks' : 'No tasks in this period'}
              subtitle={
                query
                  ? 'Try a different AWB number or customer name.'
                  : 'Tasks you work on will be listed here for quick reference.'
              }
            />
          }
        />
      )}
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
});
