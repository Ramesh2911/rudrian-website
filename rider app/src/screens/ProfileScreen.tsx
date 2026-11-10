import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ErrorState } from '../components/ErrorState';
import { Loader } from '../components/Loader';
import { OfflineBanner } from '../components/OfflineBanner';
import { getErrorMessage } from '../utils/format';
import { getLocationPermissionStatus, openAppSettings } from '../utils/location';
import { riderApi } from '../api/rider';
import { getPendingOutboxCount, getLastSyncedAt, syncOutbox } from '../net/sync';
import { useOnline } from '../net/useOnline';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { appVersion, colors, gradients, radius, spacing, typography } from '../theme';
import type { ProfileData } from '../types';
import { formatDuration, formatTime } from '../utils/format';

const SUPPORT_PHONE = 'tel:+18005550199';

const STATUS_CHIP: Record<string, { label: string; fg: string; bg: string }> = {
  PRESENT: { label: 'Present', fg: colors.success, bg: colors.successBg },
  LATE: { label: 'Late', fg: colors.warning, bg: colors.warningBg },
  HALF_DAY: { label: 'Half day', fg: colors.violet, bg: colors.violetBg },
  ABSENT: { label: 'Absent', fg: colors.danger, bg: colors.dangerBg },
  LEAVE: { label: 'Leave', fg: colors.muted, bg: colors.border },
  WEEK_OFF: { label: 'Week off', fg: colors.muted, bg: colors.border },
};

export function ProfileScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { show } = useToast();
  const online = useOnline();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [data, count, synced, permission] = await Promise.all([
        riderApi.profile(),
        getPendingOutboxCount(),
        getLastSyncedAt(),
        getLocationPermissionStatus(),
      ]);
      setProfile(data);
      setPending(count);
      setLastSynced(synced);
      setLocationPermission(permission);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const attendance = profile?.attendanceToday;
  const onShift = attendance?.action === 'IN';

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
    // tick refreshes the duration every minute while on shift.
  }, [attendance, onShift, tick]);

  const onSyncNow = useCallback(async () => {
    try {
      setSyncing(true);
      const summary = await syncOutbox({ force: true });
      setPending(summary.pending);
      setLastSynced(summary.synced > 0 ? Date.now() : await getLastSyncedAt());
      show(
        summary.synced > 0
          ? `${summary.synced} action${summary.synced === 1 ? '' : 's'} synced.`
          : summary.skipped
            ? 'Waiting for a stronger connection to sync.'
            : 'Nothing to sync right now.',
        summary.synced > 0 ? 'success' : 'info',
      );
    } finally {
      setSyncing(false);
    }
  }, [show]);

  const onLogout = useCallback(async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } catch (logoutError) {
      show(getErrorMessage(logoutError), 'error');
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  }, [show, signOut]);

  if (loading) {
    return <Loader fullScreen label="Loading profile..." />;
  }

  if (error && !profile) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={() => void load()} />
      </View>
    );
  }

  const displayName = profile?.user?.name ?? user?.name ?? 'Rider';
  const center = profile?.user?.location?.name ?? user?.location?.name ?? 'No center assigned';
  const role = (profile?.user?.role ?? user?.role ?? 'RIDER').toUpperCase();
  const phone = profile?.user?.phone ?? user?.phone ?? '';
  const email = profile?.user?.email ?? '';
  const vehicle = [profile?.user?.profile?.vehicleType, profile?.user?.profile?.vehicleNumber]
    .filter(Boolean)
    .join(' · ');
  const chip = attendance?.status ? STATUS_CHIP[attendance.status] : undefined;

  return (
    <View style={styles.screen}>
      {!online ? <OfflineBanner /> : null}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
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

          <View style={styles.logoPill}>
            <Image
              source={require('../assets/wordmark.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Rudrian Logistics Solutions logo"
            />
          </View>

          <View style={styles.avatarRing}>
            <Avatar name={displayName} size={72} />
          </View>
          <Text style={styles.heroName}>{displayName}</Text>

          <View style={styles.chipRow}>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>{role}</Text>
            </View>
            {chip ? (
              <View style={[styles.attendChip, { backgroundColor: chip.bg }]}>
                <Text style={[styles.attendChipText, { color: chip.fg }]}>{chip.label}</Text>
              </View>
            ) : null}
            {onShift ? (
              <View style={styles.onShiftChip}>
                <View style={styles.onShiftDot} />
                <Text style={styles.onShiftText}>On shift</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Ionicons name="storefront-outline" size={13} color={colors.lime} />
              <Text style={styles.pillText} numberOfLines={1}>
                {center}
              </Text>
            </View>
            {vehicle ? (
              <View style={styles.pill}>
                <Ionicons name="car-sport-outline" size={13} color={colors.lime} />
                <Text style={styles.pillText} numberOfLines={1}>
                  {vehicle}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.contactRow}>
            {phone ? (
              <Pressable
                onPress={() => void Linking.openURL(`tel:${phone}`)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${phone}`}
                testID="profile-call"
                style={({ pressed }) => [styles.contactChip, pressed ? styles.pressed : null]}
              >
                <Ionicons name="call-outline" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.contactText} numberOfLines={1}>
                  {phone}
                </Text>
              </Pressable>
            ) : null}
            {email ? (
              <Pressable
                onPress={() => void Linking.openURL(`mailto:${email}`)}
                accessibilityRole="button"
                accessibilityLabel={`Email ${email}`}
                testID="profile-email"
                style={({ pressed }) => [styles.contactChip, pressed ? styles.pressed : null]}
              >
                <Ionicons name="mail-outline" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.contactText} numberOfLines={1}>
                  {email}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{profile?.stats?.deliveredToday ?? 0}</Text>
              <Text style={styles.statLabel}>DELIVERED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{profile?.stats?.pickedToday ?? 0}</Text>
              <Text style={styles.statLabel}>PICKED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{profile?.stats?.completedWeek ?? 0}</Text>
              <Text style={styles.statLabel}>THIS WEEK</Text>
            </View>
          </View>
        </LinearGradient>

        <Card style={styles.card}>
          <View style={styles.cardHeadRow}>
            <Text style={[styles.cardTitle, styles.cardTitleFlat]}>Attendance</Text>
            {chip ? (
              <View style={[styles.attendChip, { backgroundColor: chip.bg }]}>
                <Text style={[styles.attendChipText, { color: chip.fg }]}>{chip.label}</Text>
              </View>
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
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Offline sync</Text>
          <View style={styles.syncRow}>
            <View style={styles.syncIcon}>
              <Ionicons name="sync-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.syncTextWrap}>
              <Text style={styles.syncTitle}>
                {pending} pending action{pending === 1 ? '' : 's'}
              </Text>
              <Text style={styles.syncSubtitle}>
                {lastSynced
                  ? `Last synced at ${formatTime(new Date(lastSynced).toISOString())}`
                  : 'Not synced yet on this device'}
              </Text>
            </View>
            <Button
              label="Sync now"
              size="sm"
              variant="outline"
              loading={syncing}
              onPress={() => void onSyncNow()}
              testID="profile-sync-button"
            />
          </View>
        </Card>

        <Card style={styles.card} padded={false}>
          <Text style={[styles.cardTitle, styles.cardTitleSpaced]}>Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Location permission</Text>
              <Text style={styles.settingSubtitle}>
                {locationPermission === 'granted'
                  ? 'Enabled for accurate punch and POD'
                  : 'Disabled — punches will not include coordinates'}
              </Text>
            </View>
            <Pressable
              onPress={() => void openAppSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open app settings"
              testID="open-settings-button"
              style={({ pressed }) => [styles.settingAction, pressed ? styles.pressed : null]}
            >
              <Text style={styles.settingActionText}>Open</Text>
            </Pressable>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>App version</Text>
              <Text style={styles.settingSubtitle}>Rudrian Logistics Rider v{appVersion}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <Pressable
            onPress={() => void Linking.openURL(SUPPORT_PHONE)}
            accessibilityRole="button"
            accessibilityLabel="Call help and support"
            testID="help-support-button"
            style={({ pressed }) => [styles.settingRow, pressed ? styles.pressed : null]}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="help-buoy-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Help and support</Text>
              <Text style={styles.settingSubtitle}>Call the dispatch helpdesk</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </Card>

        <Button
          label="Log out"
          variant="outline"
          onPress={() => setConfirmLogout(true)}
          testID="logout-button"
          accessibilityLabel="Log out of Rudrian Logistics Rider"
          style={styles.logout}
        />
      </ScrollView>

      <ConfirmSheet
        visible={confirmLogout}
        title="Log out?"
        message="Pending offline actions stay on this device until you sign in again and they sync."
        confirmLabel="Log out"
        destructive
        onConfirm={() => void onLogout()}
        onCancel={() => setConfirmLogout(false)}
      />
      {loggingOut ? <Loader fullScreen label="Signing out..." /> : null}
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
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
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
  logoPill: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  logoImage: {
    width: 124,
    height: 56,
  },
  avatarRing: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 42,
    padding: 3,
  },
  heroName: {
    ...typography.h1,
    color: colors.white,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  roleChip: {
    backgroundColor: colors.lime,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.petrol,
  },
  attendChip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  attendChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  onShiftChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  onShiftDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lime,
    marginRight: 5,
  },
  onShiftText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    margin: 3,
    maxWidth: 240,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    marginLeft: 5,
    flexShrink: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    margin: 3,
    maxWidth: 220,
  },
  contactText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.90)',
    marginLeft: 5,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    alignSelf: 'stretch',
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
  card: {
    marginBottom: spacing.lg,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.label,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  cardTitleSpaced: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  cardTitleFlat: {
    marginBottom: 0,
  },
  timeCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary50,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
  },
  timeCell: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.muted,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  timeValueLime: {
    color: colors.petrolSoft,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  syncTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  syncTitle: {
    ...typography.bodyStrong,
  },
  syncSubtitle: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  settingTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  settingSubtitle: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 1,
  },
  settingAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    backgroundColor: colors.primary50,
  },
  settingActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
  logout: {
    marginTop: spacing.sm,
  },
});
