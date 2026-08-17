import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { appById } from '../data/mockData';
import LoginScreen from '../screens/LoginScreen';
import AppDetailScreen from '../screens/AppDetailScreen';
import DrawerNavigator from './DrawerNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isLoggedIn, login } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="Login">
          {() => <LoginScreen onLogin={login} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="Main" component={DrawerNavigator} />
          <Stack.Screen
            name="AppDetail"
            component={AppDetailScreen}
            options={({ route }) => ({
              headerShown: true,
              title: appById(route.params.appId)?.name ?? '',
              headerStyle: { backgroundColor: colors.plum },
              headerTintColor: colors.white,
              headerShadowVisible: false,
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
