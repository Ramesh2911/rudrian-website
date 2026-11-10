import React, { useEffect, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { Input } from './Input';
import { OtpInput } from './OtpInput';
import { SignaturePad } from './SignaturePad';
import { colors, radius, spacing, typography } from '../theme';
import type { CompletePayload, Task } from '../types';
import { getErrorMessage } from '../utils/format';
import { shake } from '../utils/animation';

export interface PodSheetProps {
  visible: boolean;
  task: Task;
  onClose: () => void;
  onSubmit: (payload: CompletePayload) => Promise<'SYNCED' | 'QUEUED'>;
}

const OTP_LENGTH = 6;

export function PodSheet({ visible, task, onClose, onSubmit }: PodSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState(false);
  const otpShake = React.useRef(new Animated.Value(0)).current;

  const otpRequired = !!task.otpRequired;

  useEffect(() => {
    if (!visible) {
      setOtp('');
      setSignatureUrl(null);
      setPhotoUrl(null);
      setNotes('');
      setError(null);
      setOtpError(false);
      setSubmitting(false);
    }
  }, [visible]);

  useEffect(() => {
    if (otpError) shake(otpShake);
  }, [otpError, otpShake]);

  const takePhoto = async (): Promise<void> => {
    try {
      setError(null);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera permission is required to capture proof of delivery.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.base64) return;
      const asset = result.assets[0];
      setPhotoUrl(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    } catch {
      setError('Could not open the camera. Please try again.');
    }
  };

  const submit = async (): Promise<void> => {
    setError(null);
    setOtpError(false);

    if (otpRequired && !/^\d{4,6}$/.test(otp)) {
      setOtpError(true);
      setError('Enter the delivery OTP shared with the customer.');
      return;
    }

    const payload: CompletePayload = {
      otp: otpRequired ? otp : undefined,
      signatureUrl: signatureUrl ?? undefined,
      photoUrl: photoUrl ?? undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    try {
      setSubmitting(true);
      const outcome = await onSubmit(payload);
      if (outcome === 'SYNCED') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onClose();
    } catch (submitError) {
      setOtpError(otpRequired);
      setError(getErrorMessage(submitError));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Proof of Delivery</Text>
            <Text style={styles.headerSubtitle}>{task.awbNumber}</Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close proof of delivery"
            testID="pod-close"
            style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressed : null]}
          >
            <Ionicons name="close" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {otpRequired ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer OTP</Text>
              <Text style={styles.sectionHint}>
                Ask the customer for the {OTP_LENGTH}-digit code before handing over the parcel.
              </Text>
              <Animated.View style={{ transform: [{ translateX: otpShake }] }}>
                <OtpInput
                  value={otp}
                  onChange={(next) => {
                    setOtp(next);
                    if (otpError) setOtpError(false);
                  }}
                  length={OTP_LENGTH}
                  hasError={otpError}
                  editable={!submitting}
                />
              </Animated.View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signature</Text>
            <Text style={styles.sectionHint}>Capture the receiver&apos;s signature on the device.</Text>
            <SignaturePad value={signatureUrl} onChange={setSignatureUrl} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo evidence</Text>
            <Text style={styles.sectionHint}>Take a clear photo of the delivered parcel.</Text>
            {photoUrl ? (
              <View>
                <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
                <Pressable
                  onPress={() => setPhotoUrl(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Retake photo"
                  testID="pod-retake-photo"
                  style={({ pressed }) => [styles.retake, pressed ? styles.pressed : null]}
                >
                  <Ionicons name="camera-reverse-outline" size={16} color={colors.primary} />
                  <Text style={styles.retakeText}>Retake</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => void takePhoto()}
                accessibilityRole="button"
                accessibilityLabel="Capture delivery photo"
                testID="pod-take-photo"
                style={({ pressed }) => [styles.photoEmpty, pressed ? styles.pressed : null]}
              >
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                <Text style={styles.photoEmptyText}>Open camera</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.section}>
            <Input
              label="Notes (optional)"
              placeholder="Gate code, partial handover details, receiver comments..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.notesInput}
              containerStyle={styles.notesContainer}
              editable={!submitting}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            label="Submit POD"
            onPress={() => void submit()}
            loading={submitting}
            testID="submit-pod"
            accessibilityLabel="Submit proof of delivery"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 20,
  },
  headerSubtitle: {
    ...typography.caption,
    fontFamily: typography.mono,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: radius.control,
    backgroundColor: colors.border,
  },
  photoEmpty: {
    height: 140,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyText: {
    ...typography.label,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  retake: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    backgroundColor: colors.primary50,
  },
  retakeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  notesContainer: {
    marginBottom: 0,
  },
  notesInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: radius.control,
    padding: spacing.md,
  },
  errorText: {
    ...typography.label,
    color: colors.danger,
    marginLeft: spacing.sm,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
