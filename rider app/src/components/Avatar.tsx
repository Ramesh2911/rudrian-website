import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius } from '../theme';
import { initialsOf } from '../utils/format';

export interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 48 }: AvatarProps): React.JSX.Element {
  const fontSize = Math.round(size * 0.36);
  return (
    <LinearGradient
      colors={[colors.primary, colors.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <View>
        <Text style={[styles.text, { fontSize }]}>{initialsOf(name)}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  text: {
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
