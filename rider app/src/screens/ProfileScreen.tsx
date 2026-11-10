import React, { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { appVersion, colors, radius, spacing, typography } from '../theme';
import type { ProfileData } from '../types';
import { formatTime } from '../utils/format';

const SUPPORT_PHONE = 'tel:+18005550199';

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

  return (
    <View style={styles.screen}>
      {!online ? <OfflineBanner /> : null}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Avatar name={displayName} size={72} />
          <Text style={styles.heroName}>{displayName}</Text>
          <Text style={styles.heroRole}>{profile?.user?.role ?? user?.role ?? 'Rider'}</Text>
          <View style={styles.centerPill}>
            <Ionicons name="storefront-outline" size={14} color={colors.white} />
            <Text style={styles.centerPillText}>{center}</Text>
          </View>
        </LinearGradient>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Attendance</Text>
          <View style={styles.statRow}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Today in</Text>
              <Text style={styles.statValue}>{formatTime(profile?.attendanceToday?.inTime)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Today out</Text>
              <Text style={styles.statValue}>{formatTime(profile?.attendanceToday?.outTime)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>This week</Text>
              <Text style={styles.statValue}>{profile?.stats?.completedThisWeek ?? 0}</Text>
            </View>
          </View>
          <View style={styles.miniStats}>
            <View style={styles.miniStat}>
              <Ionicons name="cube-outline" size={14} color={colors.success} />
              <Text style={styles.miniStatText}>{profile?.stats?.deliveredToday ?? 0} delivered</Text>
            </View>
            <View style={styles.miniStat}>
              <Ionicons name="archive-outline" size={14} color={colors.violet} />
              <Text style={styles.miniStatText}>{profile?.stats?.pickedToday ?? 0} picked</Text>
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
              <Text style={styles.settingSubtitle}>SwiftLogix Rider v{appVersion}</Text>
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
          accessibilityLabel="Log out of SwiftLogix Rider"
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
    borderRadius: radius.card,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroName: {
    ...typography.h1,
    color: colors.white,
    marginTop: spacing.md,
  },
  heroRole: {
    ...typography.label,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  centerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.md,
  },
  centerPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    marginLeft: spacing.xs,
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
  cardTitleSpaced: {
    marginHorizontal: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  statLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  statValue: {
    ...typography.title,
    marginTop: 2,
  },
  miniStats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  miniStatText: {
    ...typography.caption,
    color: colors.body,
    marginLeft: spacing.xs,
    fontWeight: '600',
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
  pressed: {
    opacity: 0.7,
  },
  logout: {
    marginTop: spacing.sm,
  },
});
