import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenScaffold from '../components/ScreenScaffold';
import { colors, fonts } from '../theme/tokens';

export default function HelpScreen() {
  const [query, setQuery] = useState('');
  return (
    <ScreenScaffold searchValue={query} onSearchChange={setQuery}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.body}>
          This section is under construction for the demo. Use the sidebar to explore Home, My
          Applications and Favorites.
        </Text>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 21,
  },
});
