import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenScaffold from '../components/ScreenScaffold';
import { RECENT, appById } from '../data/mockData';
import { colors, fonts, radii, appColor } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export default function RecentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');

  return (
    <ScreenScaffold searchValue={query} onSearchChange={setQuery}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Recently Used</Text>
        <View style={styles.list}>
          {RECENT.map((r, i) => {
            const app = appById(r.id);
            if (!app) return null;
            const Icon = app.icon;
            const accent = appColor(app.id);
            return (
              <Pressable
                key={r.id}
                onPress={() => navigation.navigate('AppDetail', { appId: app.id })}
                style={[styles.row, i < RECENT.length - 1 && styles.rowBorder]}
              >
                <View style={[styles.icon, { backgroundColor: `${accent}1f` }]}>
                  <Icon size={16} color={accent} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.name}>{app.name}</Text>
                  <Text style={styles.when}>{r.when}</Text>
                </View>
                <ChevronRight size={15} color={colors.inkSoft} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 16,
  },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: { flex: 1 },
  name: {
    fontSize: 13.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  when: {
    fontSize: 11.5,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    marginTop: 2,
  },
});
