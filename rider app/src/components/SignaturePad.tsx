import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';
import { colors, radius, spacing, typography } from '../theme';

const BOARD_HEIGHT = 220;

export interface SignaturePadProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function SignaturePad({ value, onChange }: SignaturePadProps): React.JSX.Element {
  const captureRefView = useRef<React.ElementRef<typeof View>>(null);
  const currentPath = useRef('');
  const onChangeRef = useRef(onChange);
  const [paths, setPaths] = useState<string[]>([]);
  const [livePath, setLivePath] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentPath.current = `M${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setLivePath(currentPath.current);
      },
      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentPath.current += ` L${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setLivePath(currentPath.current);
      },
      onPanResponderRelease: () => {
        const finished = currentPath.current;
        currentPath.current = '';
        setLivePath('');
        if (finished.includes('L')) {
          setPaths((prev) => [...prev, finished]);
          onChangeRef.current(null);
        }
      },
      onPanResponderTerminate: () => {
        currentPath.current = '';
        setLivePath('');
      },
    }),
  ).current;

  const hasInk = paths.length > 0 || livePath.length > 0;

  const clear = (): void => {
    setPaths([]);
    setLivePath('');
    currentPath.current = '';
    onChange(null);
  };

  const save = async (): Promise<void> => {
    if (!hasInk || !captureRefView.current) return;
    try {
      setSaving(true);
      const base64 = await captureRef(captureRefView.current, {
        format: 'png',
        quality: 1,
        result: 'base64',
      });
      onChange(`data:image/png;base64,${base64}`);
    } catch {
      onChange(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <View
        ref={captureRefView}
        collapsable={false}
        style={styles.board}
        {...panResponder.panHandlers}
        testID="signature-board"
        accessibilityLabel="Signature drawing board"
      >
        <Svg style={StyleSheet.absoluteFill}>
          {paths.map((d, index) => (
            <Path
              key={`path-${index}`}
              d={d}
              stroke={colors.ink}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {livePath ? (
            <Path
              d={livePath}
              stroke={colors.ink}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
        </Svg>
        {!hasInk && !value ? (
          <View style={styles.placeholder} pointerEvents="none">
            <Text style={styles.placeholderText}>Sign inside the box</Text>
          </View>
        ) : null}
        {value ? (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.savedText}>Signature saved</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={clear}
          accessibilityRole="button"
          accessibilityLabel="Clear signature"
          testID="signature-clear"
          style={({ pressed }) => [styles.clearBtn, pressed ? styles.pressed : null]}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.danger} />
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
        <Button
          label="Save signature"
          size="sm"
          loading={saving}
          disabled={!hasInk}
          onPress={() => void save()}
          testID="signature-save"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    height: BOARD_HEIGHT,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  placeholder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.muted,
  },
  savedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  savedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    backgroundColor: colors.dangerBg,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
    marginLeft: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});
