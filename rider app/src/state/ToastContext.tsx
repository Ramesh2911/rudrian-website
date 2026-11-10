import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing } from '../theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOGGLE_COLORS: Record<ToastType, { bg: string; fg: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  success: { bg: colors.successBg, fg: colors.success, icon: 'checkmark-circle' },
  error: { bg: colors.dangerBg, fg: colors.danger, icon: 'alert-circle' },
  info: { bg: colors.primary50, fg: colors.primary, icon: 'information-circle' },
};

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ id: Date.now(), message, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          style={[styles.host, { top: insets.top + spacing.sm }]}
          accessibilityRole="alert"
        >
          <View style={[styles.toast, { backgroundColor: TOGGLE_COLORS[toast.type].bg }]}>
            <Ionicons
              name={TOGGLE_COLORS[toast.type].icon}
              size={18}
              color={TOGGLE_COLORS[toast.type].fg}
            />
            <Text style={[styles.text, { color: TOGGLE_COLORS[toast.type].fg }]} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow,
  },
  text: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
  },
});
