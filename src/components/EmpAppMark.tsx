import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface EmpAppMarkProps {
  size?: number;
}

export default function EmpAppMark({ size = 30 }: EmpAppMarkProps) {
  return (
    <Image
      source={require('../../assets/emami-logo.jpg')}
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.22 }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: '#FFFFFF',
  },
});
