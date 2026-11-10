import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Loader } from '../components/Loader';
import { PodSheet } from '../components/PodSheet';
import { StatusPill } from '../components/StatusPill';
import { getErrorMessage } from '../utils/format';
import { callPhone, getCoordinates, openMaps } from '../utils/location';
import { submitComplete } from '../net/actions';
import { loadRunsheet } from '../storage/cache';
import { mergeTask } from '../storage/localTasks';
import { useToast } from '../state/ToastContext';
import { colors, radius, spacing, typography } from '../theme';
import type { CompletePayload, Task } from '../types';
import {
  formatCod,
  formatDisplayDate,
  formatTime,
  formatWeight,
  todayIsoDate,
} from '../utils/format';
import type { HistoryStackParamList, TodayStackParamList } from '../navigation/types';

type TaskDetailRoute = RouteProp<TodayStackParamList | HistoryStackParamList, 'TaskDetail'>;

export function TaskDetailScreen(): React.JSX.Element {
  const route = useRoute<TaskDetailRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<TodayStackParamList>>();
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const { taskId, task: routeTask, scanned: scannedParam } = route.params;
  const [task, setTask] = useState<Task | undefined>(routeTask ? mergeTask(routeTask) : undefined);
  const [loading, setLoading] = useState(!routeTask);
  const [scanned, setScanned] = useState(!!scannedParam || routeTask?.status === 'IN_PROGRESS');
  const [podVisible, setPodVisible] = useState(false);

  const refreshFromLocal = useCallback(() => {
    setTask((current) => (current ? mergeTask(current) : current));
    if (scannedParam) setScanned(true);
  }, [scannedParam]);

  React.useEffect(() => {
    if (routeTask) {
      setTask(mergeTask(routeTask));
      if (scannedParam) setScanned(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { runsheet } = await loadRunsheet(todayIsoDate());
        const found = [...runsheet.deliveries, ...runsheet.pickups].find((item) => item.id === taskId);
        if (!cancelled) setTask(found ? mergeTask(found) : undefined);
      } catch {
        if (!cancelled) setTask(undefined);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeTask, taskId, scannedParam]);

  const party = useMemo(() => {
    if (!task) return undefined;
    return task.type === 'DELIVERY' ? task.receiver : task.sender;
  }, [task]);

  const completed = task?.status === 'COMPLETED';

  const openScanner = useCallback(() => {
    if (!task) return;
    navigation.navigate('Scanner', { taskId: task.id });
  }, [navigation, task]);

  const handleSubmitPod = useCallback(
    async (payload: CompletePayload): Promise<'SYNCED' | 'QUEUED'> => {
      if (!task) throw new Error('Task is unavailable.');
      const coordinates = await getCoordinates();
      const outcome = await submitComplete(task.id, payload, coordinates);
      setTask((current) => (current ? { ...current, status: 'COMPLETED' as const } : current));
      show(
        outcome === 'SYNCED'
          ? 'Delivery completed successfully.'
          : 'Saved offline. It will sync when you are back online.',
        outcome === 'SYNCED' ? 'success' : 'info',
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
      return outcome;
    },
    [navigation, show, task],
  );

  const shareReceipt = useCallback(async () => {
    if (!task) return;
    const name = party?.name ?? 'N/A';
    const address = party?.address ?? 'N/A';
    const html = `
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 32px; color: #0B1220;">
          <h2 style="margin:0 0 4px 0;">Rudrian Logistics Rider</h2>
          <p style="margin:0 0 24px 0; color:#475569;">Delivery receipt</p>
          <p><strong>AWB:</strong> ${task.awbNumber}</p>
          <p><strong>Type:</strong> ${task.type}</p>
          <p><strong>Customer:</strong> ${name}</p>
          <p><strong>Address:</strong> ${address}</p>
          <p><strong>Status:</strong> ${task.status}</p>
          <p><strong>Completed:</strong> ${formatDisplayDate()} ${formatTime(new Date().toISOString())}</p>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Delivery receipt' });
      } else {
        show('Sharing is not available on this device.', 'error');
      }
    } catch (receiptError) {
      show(getErrorMessage(receiptError), 'error');
    }
  }, [party, show, task]);

  if (loading) {
    return <Loader fullScreen label="Loading task..." />;
  }

  if (!task) {
    return (
      <View style={styles.screen}>
        <Header title="Task" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="cube-outline"
          title="Task not found"
          subtitle="This task may have been reassigned or removed from your run sheet."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const timelineSteps = [
    { label: 'Created', done: true },
    { label: 'Assigned to you', done: true },
    { label: 'Parcel scanned', done: scanned || task.status !== 'PENDING' },
    { label: task.type === 'DELIVERY' ? 'Delivered' : 'Picked up', done: completed },
  ];

  return (
    <View style={styles.screen}>
      <Header
        title={task.awbNumber}
        subtitle={task.type === 'DELIVERY' ? 'Delivery task' : 'Pickup task'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusRow}>
          <StatusPill status={task.status} />
          <Text style={styles.sequenceText}>Stop #{task.sequence}</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            {task.type === 'DELIVERY' ? 'Receiver details' : 'Sender details'}
          </Text>
          <Text style={styles.name}>{party?.name ?? 'Unknown'}</Text>

          <Pressable
            onPress={() => party?.phone && void callPhone(party.phone)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${party?.name ?? 'customer'}`}
            style={({ pressed }) => [styles.actionRow, pressed ? styles.pressed : null]}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>{party?.phone ?? 'No phone on file'}</Text>
          </Pressable>

          <Pressable
            onPress={() => party?.address && void openMaps(`${party.address}, ${party.city} ${party.pincode}`)}
            accessibilityRole="button"
            accessibilityLabel="Open address in maps"
            style={({ pressed }) => [styles.actionRow, pressed ? styles.pressed : null]}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.actionText} numberOfLines={3}>
              {[party?.address, party?.city, party?.pincode].filter(Boolean).join(', ') ||
                'Address pending'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              party?.address && void openMaps(`${party.address}, ${party.city} ${party.pincode}`)
            }
            accessibilityRole="button"
            accessibilityLabel="Open in maps"
            style={({ pressed }) => [styles.mapsBtn, pressed ? styles.pressed : null]}
          >
            <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            <Text style={styles.mapsBtnText}>Open in Maps</Text>
          </Pressable>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Package</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{task.package?.category ?? 'General'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Physical weight</Text>
            <Text style={styles.detailValue}>
              {formatWeight(task.package?.physicalWeight ?? 0)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Volumetric weight</Text>
            <Text style={styles.detailValue}>
              {formatWeight(task.package?.volumetricWeight ?? 0)}
            </Text>
          </View>
        </Card>

        {typeof task.codAmount === 'number' && task.codAmount > 0 ? (
          <Card style={[styles.card, styles.codCard]}>
            <View style={styles.codRow}>
              <View style={styles.codIcon}>
                <Ionicons name="cash-outline" size={18} color={colors.danger} />
              </View>
              <View style={styles.codTextWrap}>
                <Text style={styles.cardTitle}>Collect on delivery</Text>
                <Text style={styles.codAmount}>{formatCod(task.codAmount)}</Text>
              </View>
            </View>
            <Text style={styles.codHint}>Collect the exact amount before handing over the parcel.</Text>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Progress</Text>
          <View style={styles.timeline}>
            {timelineSteps.map((step, index) => (
              <View key={step.label} style={styles.timelineItem}>
                <View style={styles.timelineMarkerCol}>
                  <View style={[styles.timelineDot, step.done ? styles.timelineDotDone : null]} />
                  {index < timelineSteps.length - 1 ? (
                    <View style={[styles.timelineLine, step.done ? styles.timelineLineDone : null]} />
                  ) : null}
                </View>
                <Text style={[styles.timelineLabel, step.done ? styles.timelineLabelDone : null]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {completed ? (
          <>
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.completedText}>
                {task.type === 'DELIVERY' ? 'Delivered' : 'Picked up'} ·{' '}
                {formatTime(new Date().toISOString())}
              </Text>
            </View>
            <Button label="Share receipt" variant="outline" onPress={() => void shareReceipt()} />
          </>
        ) : (
          <>
            {!scanned ? (
              <Button
                label="Scan Parcel"
                onPress={openScanner}
                testID="scan-parcel-button"
                accessibilityLabel="Scan parcel barcode"
                icon={<Ionicons name="scan-outline" size={18} color={colors.white} />}
              />
            ) : (
              <View style={styles.scannedRow}>
                <View style={styles.scannedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.scannedText}>Parcel verified</Text>
                </View>
                <Button
                  label={task.type === 'DELIVERY' ? 'Complete Delivery' : 'Complete Pickup'}
                  onPress={() => setPodVisible(true)}
                  testID="complete-task-button"
                  accessibilityLabel="Complete task with proof of delivery"
                />
              </View>
            )}
          </>
        )}
      </View>

      <PodSheet
        visible={podVisible}
        task={task}
        onClose={() => {
          setPodVisible(false);
          refreshFromLocal();
        }}
        onSubmit={handleSubmitPod}
      />
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
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sequenceText: {
    ...typography.label,
    color: colors.muted,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.label,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  name: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionText: {
    ...typography.body,
    color: colors.ink,
    flex: 1,
    paddingTop: 5,
  },
  pressed: {
    opacity: 0.7,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary50,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  mapsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    ...typography.body,
    color: colors.muted,
  },
  detailValue: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  codCard: {
    borderColor: colors.dangerBg,
  },
  codRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  codTextWrap: {
    flex: 1,
  },
  codAmount: {
    ...typography.h1,
    color: colors.danger,
  },
  codHint: {
    ...typography.caption,
    color: colors.muted,
    marginTop: spacing.md,
  },
  timeline: {
    marginTop: spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineMarkerCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineDotDone: {
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: colors.primary,
  },
  timelineLabel: {
    ...typography.body,
    color: colors.muted,
    marginLeft: spacing.md,
    marginBottom: spacing.md,
  },
  timelineLabelDone: {
    color: colors.ink,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  completedText: {
    ...typography.bodyStrong,
    color: colors.success,
    marginLeft: spacing.sm,
  },
  scannedRow: {
    gap: spacing.sm,
  },
  scannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.successBg,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scannedText: {
    ...typography.bodyStrong,
    color: colors.success,
  },
});
