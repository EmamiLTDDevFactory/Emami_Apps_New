import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { colors } from '../theme/tokens';
import CustomDrawerContent from './CustomDrawerContent';
import HomeScreen from '../screens/HomeScreen';
import AppListScreen from '../screens/AppListScreen';
import RecentScreen from '../screens/RecentScreen';
import HelpScreen from '../screens/HelpScreen';
import SettingsScreen from '../screens/SettingsScreen';
import type { DrawerParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 260, backgroundColor: colors.plum },
        overlayColor: 'rgba(42,30,34,0.4)',
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
