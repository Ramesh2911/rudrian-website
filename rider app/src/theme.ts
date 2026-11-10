import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  bg: '#F6F8FB',
  card: '#FFFFFF',
  border: '#E6EAF2',
  ink: '#0B1220',
  body: '#475569',
  muted: '#94A3B8',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primary50: '#EFF6FF',
  accent: '#4F46E5',
  success: '#16A34A',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningBg: '#FFF7ED',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  violet: '#7C3AED',
  violetBg: '#F5F3FF',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  card: 18,
  control: 12,
  pill: 999,
} as const;

export const shadow: ViewStyle = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

export const typography = {
  caption: { fontSize: 12, lineHeight: 16, color: colors.body } satisfies TextStyle,
  label: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.body,
    fontWeight: '500',
  } satisfies TextStyle,
  body: { fontSize: 15, lineHeight: 22, color: colors.body } satisfies TextStyle,
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    fontWeight: '600',
  } satisfies TextStyle,
  title: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink,
    fontWeight: '700',
    letterSpacing: -0.2,
  } satisfies TextStyle,
  h1: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
    fontWeight: '700',
    letterSpacing: -0.4,
  } satisfies TextStyle,
  display: {
    fontSize: 34,
    lineHeight: 40,
    color: colors.ink,
    fontWeight: '800',
    letterSpacing: -0.8,
  } satisfies TextStyle,
  mono:
    Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) ??
    'monospace',
} as const;

export const appVersion = '1.0.0';
