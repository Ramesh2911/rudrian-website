import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { getErrorMessage } from '../utils/format';
import { openAppSettings } from '../utils/location';
import { submitScan } from '../net/actions';
import { loadRunsheet } from '../storage/cache';
import { mergeTask } from '../storage/localTasks';
import { useToast } from '../state/ToastContext';
import { colors, radius, spacing, typography } from '../theme';
import type { Task } from '../types';
import { todayIsoDate } from '../utils/format';
import { shake } from '../utils/animation';
import type { HistoryStackParamList, TodayStackParamList } from '../navigation/types';

type ScannerRoute = RouteProp<TodayStackParamList | HistoryStackParamList, 'Scanner'>;

const FRAME_SIZE = 250;
const BARCODE_TYPES = ['code128', 'qr', 'ean13', 'ean8', 'upc_a', 'code39'] as const;

export function ScannerScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<TodayStackParamList>>();
  const route = useRoute<ScannerRoute>();
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const expectedTaskId = route.params?.taskId;

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const busyRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const lineY = useRef(new Animated.Value(0)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain !== false) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(lineY, {
          toValue: FRAME_SIZE - 4,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(lineY, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [lineY]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { runsheet } = await loadRunsheet(todayIsoDate());
        if (cancelled) return;
        setTasks([...runsheet.deliveries, ...runsheet.pickups].map(mergeTask));
      } catch {
        // Offline: matching will rely on whatever cached sheet loaded.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const failWith = useCallback(
    (message: string) => {
      setErrorText(message);
      shake(errorShake);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
    [errorShake],
  );

  const handleCode = useCallback(
    async (rawCode: string) => {
      if (busyRef.current) return;
      const code = rawCode.trim();
      if (!code) return;

      const now = Date.now();
      if (lastScanRef.current.code === code && now - lastScanRef.current.at < 2000) return;
      lastScanRef.current = { code, at: now };

      busyRef.current = true;
      setWorking(true);
      setErrorText(null);
      try {
        let match: Task | undefined = tasks.find((task) => task.awbNumber === code);

        if (!match && tasks.length === 0) {
          const { runsheet } = await loadRunsheet(todayIsoDate());
          const refreshed = [...runsheet.deliveries, ...runsheet.pickups].map(mergeTask);
          setTasks(refreshed);
          match = refreshed.find((task) => task.awbNumber === code);
        }

        if (expectedTaskId) {
          const expected = tasks.find((task) => task.id === expectedTaskId);
          if (expected && expected.awbNumber !== code) {
            failWith('Barcode does not match this task');
            return;
          }
          match = match ?? expected;
        }

        if (!match) {
          failWith(`No task matches ${code}`);
          return;
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const outcome = await submitScan(match.id, code);
        if (outcome === 'QUEUED') {
          show('Scan saved offline. It will sync automatically.', 'info');
        }
        navigation.navigate('TaskDetail', {
          taskId: match.id,
          task: match,
          scanned: true,
        });
      } catch (scanError) {
        failWith(getErrorMessage(scanError));
      } finally {
        busyRef.current = false;
        setWorking(false);
      }
    },
    [expectedTaskId, failWith, navigation, show, tasks],
  );

  const denied = !!permission && !permission.granted;

  const manualCard = (
    <View style={[styles.manualCard, { paddingBottom: insets.bottom + spacing.md }]}>
      <Text style={styles.manualTitle}>Enter AWB manually</Text>
      <View style={styles.manualRow}>
        <TextInput
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="e.g. SLX-100234"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.manualInput}
          testID="manual-awb-input"
          accessibilityLabel="Manual AWB entry"
        />
        <Button
          label="Go"
          size="md"
          onPress={() => void handleCode(manualCode)}
          disabled={!manualCode.trim() || working}
          testID="manual-awb-go"
        />
      </View>
    </View>
  );

  if (denied) {
    return (
      <View style={styles.screen}>
        <Header title="Scan parcel" onBack={() => navigation.goBack()} />
        <View style={styles.permissionWrap}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            SwiftLogix Rider uses the camera to read parcel barcodes for secure handovers. You can
            still enter the AWB manually below.
          </Text>
          {permission?.canAskAgain !== false ? (
            <Button label="Allow camera access" onPress={() => void requestPermission()} style={styles.permissionBtn} />
          ) : (
            <Button label="Open Settings" variant="outline" onPress={() => void openAppSettings()} style={styles.permissionBtn} />
          )}
        </View>
        {manualCard}
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.screen}>
        <Header title="Scan parcel" onBack={() => navigation.goBack()} />
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionBody}>Preparing camera...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={(result) => void handleCode(result.data)}
        />

        <View style={styles.overlay}>
          <Header
            title="Scan parcel"
            subtitle="Align the barcode inside the frame"
            onBack={() => navigation.goBack()}
            transparent
            right={
              <Pressable
                onPress={() => setTorch((value) => !value)}
                accessibilityRole="button"
                accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
                testID="torch-toggle"
                style={({ pressed }) => [styles.torchBtn, pressed ? styles.pressed : null]}
              >
                <Ionicons
                  name={torch ? 'flashlight' : 'flashlight-outline'}
                  size={20}
                  color={torch ? colors.primary : colors.ink}
                />
              </Pressable>
            }
          />

          <View style={styles.frameArea} testID="scan-frame" accessibilityLabel="Barcode scanning frame">
            <Animated.View style={[styles.frame, { transform: [{ translateX: errorShake }] }]}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Animated.View
                style={[styles.scanLine, { transform: [{ translateY: lineY }] }]}
              />
            </Animated.View>
          </View>

          <View style={styles.bottomHint}>
            {errorText ? (
              <View style={styles.errorChip} accessibilityRole="alert">
                <Ionicons name="close-circle" size={16} color={colors.white} />
                <Text style={styles.errorChipText}>{errorText}</Text>
              </View>
            ) : (
              <View style={styles.hintChip}>
                <Text style={styles.hintText}>
                  {working ? 'Verifying barcode...' : 'Scanning for parcel barcodes'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {manualCard}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  cameraWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  frameArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: radius.card,
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: colors.white,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: radius.card,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: radius.card,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radius.card,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radius.card,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  bottomHint: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  hintChip: {
    backgroundColor: 'rgba(11, 18, 32, 0.7)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  hintText: {
    ...typography.label,
    color: colors.white,
  },
  errorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxWidth: '90%',
  },
  errorChipText: {
    ...typography.label,
    color: colors.white,
    marginLeft: spacing.sm,
    flexShrink: 1,
  },
  torchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...typography.h1,
    textAlign: 'center',
  },
  permissionBody: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  permissionBtn: {
    marginTop: spacing.xl,
    minWidth: 200,
  },
  manualCard: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  manualTitle: {
    ...typography.label,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    height: 48,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
    color: colors.ink,
    fontSize: 15,
    fontFamily: typography.mono,
  },
});
