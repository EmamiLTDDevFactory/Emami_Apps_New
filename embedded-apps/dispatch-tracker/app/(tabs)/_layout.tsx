import { Tabs } from 'expo-router';
import { ColorValue, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { TopBar } from '@/components/TopBar';
import { useData } from '@/contexts/DataContext';

/**
 * Ported from the 7-button custom nav row in main_panel.py's main().
 * Native bottom tabs are the mobile-idiomatic equivalent of that row;
 * badge counts mirror the dynamic suffixes documented in spec_main_panel.md §3.1
 * (POD-pending suffix on Completed is dropped — POD upload is dead code, see
 * spec_dis_shared_components.md §8 item 2, so there is nothing to count).
 */
export default function TabsLayout() {
  const { pendCache, dispCache, retCache, cancCache } = useData();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.navy,
          tabBarInactiveTintColor: colors.g400,
          tabBarLabelStyle: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.3 },
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.g200 },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }} />
        <Tabs.Screen
          name="pending"
          options={{
            title: 'Pending',
            tabBarIcon: ({ color }) => <TabIcon icon="⏳" color={color} />,
            tabBarBadge: pendCache?.length ? pendCache.length : undefined,
          }}
        />
        <Tabs.Screen
          name="dispatched"
          options={{
            title: 'Dispatched',
            tabBarIcon: ({ color }) => <TabIcon icon="🚚" color={color} />,
            tabBarBadge: dispCache?.length ? dispCache.length : undefined,
          }}
        />
        <Tabs.Screen name="completed" options={{ title: 'Completed', tabBarIcon: ({ color }) => <TabIcon icon="✅" color={color} /> }} />
        <Tabs.Screen
          name="returned"
          options={{
            title: 'Returned',
            tabBarIcon: ({ color }) => <TabIcon icon="↩" color={color} />,
            tabBarBadge: retCache?.length ? retCache.length : undefined,
          }}
        />
        <Tabs.Screen
          name="cancelled"
          options={{
            title: 'Cancelled',
            tabBarIcon: ({ color }) => <TabIcon icon="✕" color={color} />,
            tabBarBadge: cancCache?.length ? cancCache.length : undefined,
          }}
        />
        <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} /> }} />
      </Tabs>
    </View>
  );
}

function TabIcon({ icon, color }: { icon: string; color: ColorValue }) {
  return <Text style={{ fontSize: 16, color }}>{icon}</Text>;
}
