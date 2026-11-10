import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components/Button';
import { Input } from '../components/Input';
import type { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { colors, gradients, radius, spacing, typography, appVersion } from '../theme';
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

  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const blockStyle = (inputRange: readonly number[]) => ({
    opacity: entrance.interpolate({
      inputRange,
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange,
          outputRange: [22, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  });

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
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        <View pointerEvents="none" style={styles.decorLayer}>
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />
          <View style={styles.limeDash} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.logoBlock, blockStyle([0, 0.55])]}>
          <View style={styles.logoCard}>
            <Image
              source={require('../assets/wordmark.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Rudrian Logistics Solutions logo"
            />
          </View>
          <Text style={styles.eyebrow}>RIDER PARTNER APP</Text>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>
            Sign in to start today&apos;s deliveries, pickups and proof of delivery.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.formWrap, blockStyle([0.18, 0.75])]}>
          <View style={styles.formCard} testID="login-card">
            <Text style={styles.formTitle}>Sign in</Text>
            <Text style={styles.formHint}>
              Use the phone number or email registered with dispatch.
            </Text>

            <Input
              label="Phone or email"
              placeholder="9876543210 or rider@rudrianlogistics.com"
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
          </View>
        </Animated.View>

        <Animated.View style={[styles.footer, blockStyle([0.35, 1])]}>
          <Text style={styles.footerText}>Rudrian Logistics Rider v{appVersion}</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.petrol,
  },
  decorLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 40,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(44,201,217,0.20)',
  },
  limeDash: {
    position: 'absolute',
    top: 64,
    left: 32,
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lime,
    opacity: 0.9,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl + spacing.xxl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    shadowColor: '#001E2C',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 184,
    height: 82,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: colors.lime,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.display,
    color: colors.white,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.78)',
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  formWrap: {
    width: '100%',
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#001E2C',
    shadowOpacity: 0.3,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
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
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.55)',
  },
});
