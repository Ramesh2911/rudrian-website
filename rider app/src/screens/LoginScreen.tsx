import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import type { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { colors, radius, spacing, typography, appVersion } from '../theme';
import { getErrorMessage } from '../utils/format';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen(_props: Props): React.JSX.Element {
  const { signIn, completeSignIn } = useAuth();
  const { show } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedInCenter, setSignedInCenter] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    const id = identifier.trim();
    if (!id || !password) {
      setError('Enter your phone/email and password to continue.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await signIn(id, password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (user.location?.name) {
        setSignedInCenter(user.location.name);
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      completeSignIn(user);
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setError(message);
      show(message, 'error');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.logoMark}>
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path d="M13 2 L5 13.6 h5.4 L10 22 l9-12.4 h-6 z" fill={colors.white} />
            </Svg>
          </View>
          <Text style={styles.heroTitle}>SwiftLogix Rider</Text>
          <Text style={styles.heroSubtitle}>
            Deliveries, pickups and proof of delivery in one place.
          </Text>
        </LinearGradient>

        <Card style={styles.formCard} testID="login-card">
          <Text style={styles.formTitle}>Sign in</Text>
          <Text style={styles.formHint}>Use the phone number or email registered with dispatch.</Text>

          <Input
            label="Phone or email"
            placeholder="9876543210 or rider@swiftlogix.app"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            leftIcon="person-circle-outline"
            containerStyle={styles.input}
            testID="login-identifier"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon="lock-closed-outline"
            containerStyle={styles.input}
            testID="login-password"
            onSubmitEditing={() => void submit()}
          />

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {signedInCenter ? (
            <View style={styles.centerRow} accessibilityRole="status">
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.centerText} numberOfLines={1}>
                Signed in to {signedInCenter}
              </Text>
            </View>
          ) : null}

          <Button
            label="Sign In"
            onPress={() => void submit()}
            loading={loading}
            testID="login-button"
            accessibilityLabel="Sign in"
            style={styles.button}
          />
        </Card>

        <Pressable style={styles.footer} accessibilityRole="text">
          <Text style={styles.footerText}>SwiftLogix Rider v{appVersion}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl + spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  hero: {
    borderRadius: radius.card,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.display,
    color: colors.white,
    fontSize: 28,
    lineHeight: 34,
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.sm,
  },
  formCard: {
    padding: spacing.xl,
  },
  formTitle: {
    ...typography.h1,
  },
  formHint: {
    ...typography.caption,
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.label,
    color: colors.danger,
    marginLeft: spacing.sm,
    flex: 1,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  centerText: {
    ...typography.label,
    color: colors.success,
    marginLeft: spacing.sm,
    flex: 1,
  },
  button: {
    marginTop: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    ...typography.caption,
    color: colors.muted,
  },
});
