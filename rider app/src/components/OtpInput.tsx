import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
} from 'react-native';

import { colors, radius } from '../theme';
import { shake } from '../utils/animation';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  hasError?: boolean;
  editable?: boolean;
  testID?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  hasError = false,
  editable = true,
  testID = 'otp-input',
}: OtpInputProps): React.JSX.Element {
  const refs = useRef<Array<React.ElementRef<typeof TextInput> | null>>([]);
  const shakeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasError) shake(shakeValue);
  }, [hasError, shakeValue]);

  const handleChange = (text: string, index: number): void => {
    const digits = text.replace(/[^0-9]/g, '');
    const chars = value.padEnd(length, ' ').split('');

    if (digits.length === 0) {
      chars[index] = ' ';
      onChange(chars.join('').replace(/\s+$/g, ''));
      return;
    }

    for (let i = 0; i < digits.length && index + i < length; i += 1) {
      chars[index + i] = digits.charAt(i);
    }
    const joined = chars.join('').replace(/\s+$/g, '');
    onChange(joined);

    const nextIndex = Math.min(index + digits.length, length - 1);
    if (nextIndex !== index) {
      refs.current[nextIndex]?.focus();
    }
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<{ key: string }>,
    index: number,
  ): void => {
    if (event.nativeEvent.key !== 'Backspace') return;
    const current = value.charAt(index) ?? '';
    if (current === '' && index > 0) {
      const chars = value.padEnd(length, ' ').split('');
      chars[index - 1] = ' ';
      onChange(chars.join('').replace(/\s+$/g, ''));
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <Animated.View
      testID={testID}
      accessibilityLabel="One time password input"
      style={[styles.row, { transform: [{ translateX: shakeValue }] }]}
    >
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={`otp-box-${index}`}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={value.charAt(index) ?? ''}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(event) => handleKeyPress(event, index)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={length}
          editable={editable}
          selectTextOnFocus
          accessibilityLabel={`OTP digit ${index + 1}`}
          style={[styles.box, hasError ? styles.boxError : null]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  boxError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
});
