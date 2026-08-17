import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme/tokens';

interface EmpAppMarkProps {
  size?: number;
  dark?: boolean;
}

export default function EmpAppMark({ size = 30, dark }: EmpAppMarkProps) {
  const inner = (
    <Text style={{ color: colors.white, fontFamily: fonts.serifSemiBold, fontSize: size * 0.46 }}>e</Text>
  );

  if (dark) {
    return (
      <LinearGradient
        colors={[colors.amber, colors.rust]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mark, { width: size, height: size, borderRadius: size * 0.27 }]}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.27, backgroundColor: colors.plum }]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
