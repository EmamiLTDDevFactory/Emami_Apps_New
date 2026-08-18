import React, { useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Icons from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import { colors, font, shadow } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import GlassSurface from "@/components/ui/GlassSurface";

type TabMeta = { label: string; Icon: Icons.Icon };

function TabItem({
  meta,
  focused,
  onPress,
}: {
  meta: TabMeta;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1 : 0.9);
  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.9, { damping: 14, stiffness: 160 });
  }, [focused]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const { Icon } = meta;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.item}>
      <Animated.View style={[styles.iconWrap, focused && styles.iconWrapActive, animStyle]}>
        <Icon
          size={24}
          weight={focused ? "fill" : "regular"}
          color={focused ? colors.brand : colors.textFaint}
        />
      </Animated.View>
      <Text style={[styles.label, { color: focused ? colors.brand : colors.textFaint }]}>
        {meta.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CustomTabs({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const TABS: Record<string, TabMeta> = {
    index: { label: "Home", Icon: Icons.House },
    statistics: { label: "Insights", Icon: Icons.ChartLineUp },
    profile: { label: "Profile", Icon: Icons.UserCircle },
    admindashboard: { label: "Dashboard", Icon: Icons.SquaresFour },
  };

  return (
    <View style={shadow.floating}>
      <GlassSurface
        intensity="card"
        tint="light"
        borderRadius={0}
        style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }] as any}
      >
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          // Hide admin dashboard tab for non-admin users
          if (route.name === "admindashboard" && user?.Role !== "Admin") return null;
          const focused = state.index === index;

          const onPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return <TabItem key={route.key} meta={meta} focused={focused} onPress={onPress} />;
        })}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    paddingTop: 10,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  iconWrap: {
    width: 52,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: colors.brandSoft, ...shadow.glow, shadowOpacity: 0.18 },
  label: { fontSize: font.micro, fontWeight: font.bold },
});
