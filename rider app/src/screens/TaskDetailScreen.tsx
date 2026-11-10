import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { colors, gradients, radius, spacing, typography } from '../theme';
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
  const isDelivery = task?.type === 'DELIVERY';
  const showCod = typeof task?.codAmount === 'number' && (task.codAmount ?? 0) > 0;

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
        <body style="font-family: -apple-system, sans-serif; padding: 32px; color: #06171F;">
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
    { label: 'Created', done: true, time: formatTime(task.createdAt) },
    { label: 'Assigned to you', done: true, time: null },
    { label: 'Parcel scanned', done: scanned || task.status !== 'PENDING', time: null },
    {
      label: isDelivery ? 'Delivered' : 'Picked up',
      done: completed,
      time: completed ? formatTime(new Date().toISOString()) : null,
    },
  ];

  const fullAddress = [party?.address, party?.city, party?.pincode].filter(Boolean).join(', ');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 150 + insets.bottom }]}
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

          <View style={styles.heroTopRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              testID="task-detail-back"
              hitSlop={8}
              style={({ pressed }) => [styles.backBtn, pressed ? styles.pressed : null]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
            <View style={styles.typeChip}>
              <Ionicons
                name={isDelivery ? 'cube-outline' : 'archive-outline'}
                size={12}
                color={colors.white}
              />
              <Text style={styles.typeChipText}>{isDelivery ? 'DELIVERY' : 'PICKUP'}</Text>
            </View>
          </View>

          <Text style={styles.awb} numberOfLines={1}>
            {task.awbNumber}
          </Text>

          <View style={styles.badgeRow}>
            <StatusPill status={task.status} />
            <View style={styles.stopChip}>
              <Text style={styles.stopChipText}>STOP {task.sequence}</Text>
            </View>
            {task.otpRequired ? (
              <View style={styles.otpChip}>
                <Ionicons name="key-outline" size={11} color={colors.petrol} />
                <Text style={styles.otpChipText}>OTP</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.partyBlock}>
            <Text style={styles.partyName} numberOfLines={1}>
              {party?.name ?? 'Unknown'}
            </Text>
            <Text style={styles.partyMeta} numberOfLines={1}>
              {party?.phone ?? 'No phone on file'}
            </Text>
            <Pressable
              onPress={() => fullAddress && void openMaps(`${party?.address}, ${party?.city} ${party?.pincode}`)}
              accessibilityRole="button"
              accessibilityLabel="Open address in maps"
              style={({ pressed }) => [styles.addressPress, pressed ? styles.pressed : null]}
            >
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
              <Text style={styles.addressText} numberOfLines={2}>
                {fullAddress || 'Address pending'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.quickRow}>
            <Pressable
              onPress={() => party?.phone && void callPhone(party.phone)}
              accessibilityRole="button"
              accessibilityLabel={`Call ${party?.name ?? 'customer'}`}
              testID="task-call-button"
              style={({ pressed }) => [styles.quickBtn, pressed ? styles.pressed : null]}
            >
              <Ionicons name="call" size={16} color={colors.petrol} />
              <Text style={styles.quickBtnText}>Call</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                party?.address && void openMaps(`${party.address}, ${party.city} ${party.pincode}`)
              }
              accessibilityRole="button"
              accessibilityLabel="Open in maps"
              testID="task-maps-button"
              style={({ pressed }) => [styles.quickBtn, pressed ? styles.pressed : null]}
            >
              <Ionicons name="navigate" size={16} color={colors.petrol} />
              <Text style={styles.quickBtnText}>Navigate</Text>
            </Pressable>
            <Pressable
              onPress={() => void shareReceipt()}
              disabled={!completed}
              accessibilityRole="button"
              accessibilityLabel="Share receipt"
              testID="task-receipt-button"
              style={({ pressed }) => [
                styles.quickBtn,
                !completed ? styles.quickBtnDisabled : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Ionicons
                name="share-outline"
                size={16}
                color={completed ? colors.petrol : 'rgba(6,23,31,0.35)'}
              />
              <Text style={[styles.quickBtnText, !completed ? styles.quickBtnTextDisabled : null]}>
                Receipt
              </Text>
            </Pressable>
          </View>

          {showCod ? (
            <View style={styles.codBanner}>
              <View style={styles.codIcon}>
                <Ionicons name="cash-outline" size={18} color={colors.petrol} />
              </View>
              <View style={styles.codTextWrap}>
                <Text style={styles.codLabel}>COLLECT ON DELIVERY</Text>
                <Text style={styles.codAmount}>{formatCod(task.codAmount as number)}</Text>
              </View>
            </View>
          ) : null}
          {showCod ? (
            <Text style={styles.codHint}>
              Collect the exact amount before handing over the parcel.
            </Text>
          ) : null}
        </LinearGradient>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Package</Text>
          <View style={styles.pkgGrid}>
            <View style={styles.pkgCell}>
              <View style={styles.pkgIcon}>
                <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.pkgLabel}>Category</Text>
              <Text style={styles.pkgValue} numberOfLines={1}>
                {task.package?.category ?? 'General'}
              </Text>
            </View>
            <View style={styles.pkgCell}>
              <View style={styles.pkgIcon}>
                <Ionicons name="barbell-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.pkgLabel}>Physical</Text>
              <Text style={styles.pkgValue}>
                {formatWeight(task.package?.physicalWeight ?? 0)}
              </Text>
            </View>
            <View style={styles.pkgCell}>
              <View style={styles.pkgIcon}>
                <Ionicons name="cube-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.pkgLabel}>Volumetric</Text>
              <Text style={styles.pkgValue}>
                {formatWeight(task.package?.volumetricWeight ?? 0)}
              </Text>
            </View>
            <View style={styles.pkgCell}>
              <View style={styles.pkgIcon}>
                <Ionicons
                  name={task.otpRequired ? 'key-outline' : 'close-circle-outline'}
                  size={16}
                  color={task.otpRequired ? colors.warning : colors.muted}
                />
              </View>
              <Text style={styles.pkgLabel}>OTP</Text>
              <Text style={styles.pkgValue}>
                {task.otpRequired ? 'Required' : 'Not needed'}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Progress</Text>
          <View style={styles.timeline}>
            {timelineSteps.map((step, index) => (
              <View key={step.label} style={styles.timelineItem}>
                <View style={styles.timelineMarkerCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.done ? styles.timelineDotDone : null,
                    ]}
                  >
                    <Ionicons
                      name={step.done ? 'checkmark' : 'ellipse-outline'}
                      size={step.done ? 12 : 8}
                      color={step.done ? colors.white : colors.muted}
                    />
                  </View>
                  {index < timelineSteps.length - 1 ? (
                    <View
                      style={[styles.timelineLine, step.done ? styles.timelineLineDone : null]}
                    />
                  ) : null}
                </View>
                <View style={styles.timelineTextWrap}>
                  <Text
                    style={[styles.timelineLabel, step.done ? styles.timelineLabelDone : null]}
                  >
                    {step.label}
                  </Text>
                  {step.time ? <Text style={styles.timelineTime}>{step.time}</Text> : null}
                </View>
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
                {isDelivery ? 'Delivered' : 'Picked up'} ·{' '}
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
                  label={isDelivery ? 'Complete Delivery' : 'Complete Pickup'}
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
  hero: {
    borderRadius: 24,
    padding: spacing.xl,
    marginBottom: spacing.lg,
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.white,
    marginLeft: 5,
  },
  awb: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.white,
    fontFamily: typography.mono,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  stopChip: {
    backgroundColor: colors.lime,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  stopChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.petrol,
  },
  otpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  otpChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.warning,
    marginLeft: 3,
  },
  partyBlock: {
    marginBottom: spacing.lg,
  },
  partyName: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.3,
  },
  partyMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    marginTop: 3,
  },
  addressPress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.65)',
    marginLeft: 5,
    flex: 1,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.control,
    paddingVertical: spacing.sm + 3,
    shadowColor: '#001E2C',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  quickBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    shadowOpacity: 0,
    elevation: 0,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.petrol,
    marginLeft: 6,
  },
  quickBtnTextDisabled: {
    color: 'rgba(6,23,31,0.35)',
  },
  pressed: {
    opacity: 0.75,
  },
  codBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lime,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  codIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,80,112,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  codTextWrap: {
    flex: 1,
  },
  codLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(0,80,112,0.75)',
  },
  codAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.petrol,
    letterSpacing: -0.4,
    marginTop: 1,
  },
  codHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: spacing.sm,
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
  pkgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pkgCell: {
    width: '50%',
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
  },
  pkgIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pkgLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  pkgValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
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
    width: 24,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
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
  timelineTextWrap: {
    flex: 1,
    marginLeft: spacing.md,
    marginBottom: spacing.md,
  },
  timelineLabel: {
    ...typography.body,
    color: colors.muted,
  },
  timelineLabelDone: {
    color: colors.ink,
    fontWeight: '700',
  },
  timelineTime: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
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
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
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
