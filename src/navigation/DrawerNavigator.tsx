import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { colors } from '../theme/tokens';
import { useIsWideScreen } from '../hooks/useIsWideScreen';
import CustomDrawerContent from './CustomDrawerContent';
import HomeScreen from '../screens/HomeScreen';
import AppListScreen from '../screens/AppListScreen';
import RecentScreen from '../screens/RecentScreen';
import HelpScreen from '../screens/HelpScreen';
import SettingsScreen from '../screens/SettingsScreen';
import type { DrawerParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function DrawerNavigator() {
  const isWideScreen = useIsWideScreen();

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: isWideScreen ? 'permanent' : 'front',
        drawerStyle: {
          width: 260,
          backgroundColor: colors.sidebar,
          borderRightWidth: isWideScreen ? 1 : 0,
          borderRightColor: colors.sidebarBorder,
        },
        overlayColor: 'rgba(31,27,51,0.35)',
        swipeEdgeWidth: 40,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="MyApplications">
        {() => <AppListScreen title="My Applications" />}
      </Drawer.Screen>
      <Drawer.Screen name="Favorites">
        {() => <AppListScreen title="Favorites" onlyFavorites />}
      </Drawer.Screen>
      <Drawer.Screen name="Recent" component={RecentScreen} />
      <Drawer.Screen name="AllApplications">
        {() => <AppListScreen title="All Applications" />}
      </Drawer.Screen>
      <Drawer.Screen name="Help" component={HelpScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
