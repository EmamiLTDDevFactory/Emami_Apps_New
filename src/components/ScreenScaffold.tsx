import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { colors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import Header from './Header';

interface ScreenScaffoldProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  children: React.ReactNode;
}

export default function ScreenScaffold({ searchValue, onSearchChange, children }: ScreenScaffoldProps) {
  const navigation = useNavigation();
  const { logout } = useAuth();

  return (
    <View style={styles.flex}>
      <Header
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onOpenMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
        onSignOut={logout}
        onOpenSettings={() => navigation.navigate('Settings' as never)}
      />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  body: {
    flex: 1,
  },
});
