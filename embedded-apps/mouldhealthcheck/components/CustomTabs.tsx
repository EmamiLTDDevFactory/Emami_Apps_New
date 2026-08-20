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
import { useBreakpoint, SIDEBAR_WIDTH } from "@/utils/responsive";

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

function SidebarItem({
  meta,
  focused,
  onPress,
}: {
  meta: TabMeta;
  focused: boolean;
  onPress: () => void;
}) {
  const { Icon } = meta;
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.sidebarItem, focused && styles.sidebarItemActive]}>
      <Icon size={20} weight={focused ? "fill" : "regular"} color={focused ? colors.brand : colors.textMuted} />
      <Text style={[styles.sidebarLabel, { color: focused ? colors.brand : colors.textBody }]}>{meta.label}</Text>
    </TouchableOpacity>
  );
}

export default function CustomTabs({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isTabletUp } = useBreakpoint();

  // "Insights" reads as "Submission History" for the vendor who submitted the inspections, and
  // "Approval History" for the admin reviewing/approving them — same screen, role-specific label.
  const TABS: Record<string, TabMeta> = {
    index: { label: "Home", Icon: Icons.House },
    statistics: { label: user?.Role === "Admin" ? "Approval History" : "Submission History", Icon: Icons.ChartLineUp },
    // profile: { label: "Profile", Icon: Icons.UserCircle },
    admindashboard: { label: "Dashboard", Icon: Icons.SquaresFour },
  };

  const visibleRoutes = state.routes
    .map((route, index) => ({ route, index, meta: TABS[route.name] }))
    .filter(({ route, meta }) => !!meta && !(route.name === "admindashboard" && user?.Role !== "Admin"));

  const pressHandler = (route: (typeof visibleRoutes)[number]["route"], focused: boolean) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  if (isTabletUp) {
    return (
      <View style={[styles.sidebar, { paddingTop: insets.top + 20 }]}>
        <View style={styles.sidebarBrand}>
          <View style={styles.sidebarLogo}>
            <Icons.Cube size={20} color={colors.brand} weight="fill" />
          </View>
          <Text style={[styles.sidebarBrandText, { fontSize: 14, lineHeight: 17 }]} numberOfLines={2}>Mold Health Inspection</Text>
        </View>

        <View style={styles.sidebarList}>
          {visibleRoutes.map(({ route, index, meta }) => (
            <SidebarItem
              key={route.key}
              meta={meta!}
              focused={state.index === index}
              onPress={pressHandler(route, state.index === index)}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={shadow.floating}>
      <GlassSurface
        intensity="card"
        tint="light"
        borderRadius={0}
        style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }] as any}
      >
        {visibleRoutes.map(({ route, index, meta }) => (
          <TabItem key={route.key} meta={meta!} focused={state.index === index} onPress={pressHandler(route, state.index === index)} />
        ))}
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

  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 14,
  },
  sidebarBrand: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, marginBottom: 24 },
  sidebarLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarBrandText: { fontSize: font.title, fontWeight: font.black, color: colors.ink },
  sidebarList: { gap: 2 },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
  },
  sidebarItemActive: { backgroundColor: colors.brandSoft },
  sidebarLabel: { fontSize: font.sub, fontWeight: font.semibold },
});
