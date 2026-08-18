import React, { ReactNode } from "react";
import {
  View,
  ScrollView,
  StatusBar,
  StyleSheet,
  ViewStyle,
  RefreshControlProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

type Props = {
  children: ReactNode;
  /** Wrap children in a ScrollView (default true). */
  scroll?: boolean;
  /** Background colour of the screen. */
  bg?: string;
  /** Apply top safe-area padding (default true). */
  topInset?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  barStyle?: "light-content" | "dark-content";
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

/**
 * Modern screen container — handles safe-area, status bar and a light Swiggy
 * background. Replaces the old dark `ScreenWrapper`.
 */
export default function Screen({
  children,
  scroll = true,
  bg = colors.bg,
  topInset = true,
  style,
  contentStyle,
  barStyle = "dark-content",
  refreshControl,
}: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop = topInset ? insets.top : 0;

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop }, style]}>
      <StatusBar barStyle={barStyle} backgroundColor="transparent" translucent />
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          contentContainerStyle={[
            { paddingBottom: insets.bottom + 28 },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
});
