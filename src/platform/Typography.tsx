import React from 'react';
import {StyleSheet, Text, TextInput} from 'react-native';

/** Embedded by expo-font at build time; no network or async font loading. */
const styles = StyleSheet.create({body: {fontFamily: 'Pretendard'}});

export function AppText(props: React.ComponentProps<typeof Text>) {
  return <Text {...props} style={[styles.body, props.style]} />;
}

export function AppTextInput(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} style={[styles.body, props.style]} />;
}
