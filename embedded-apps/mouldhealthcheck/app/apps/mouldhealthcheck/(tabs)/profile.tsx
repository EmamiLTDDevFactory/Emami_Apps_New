import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Icons from "phosphor-react-native";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GlassSurface from "@/components/ui/GlassSurface";
import { colors, font, gradients, radius, shadow } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { APP_DEPT, APP_VERSION } from "@/lib/config";
import { Platform } from "react-native";
// Optional: If you persist user data locally, uncomment the import below
// import AsyncStorage from '@react-native-async-storage/async-storage';

type Option = {
  title: string;
  subtitle: string;
  Icon: Icons.Icon;
  tint: string;
  tintBg: string;
  route?: string;
  action?: "logout";
};

const OPTIONS: Option[] = [
  //{ title: "Edit Profile", subtitle: "Update your details", Icon: Icons.UserGear, tint: colors.info, tintBg: colors.infoSoft, route: "/(modals)/profileModal" },
  //{ title: "Notifications", subtitle: "Inspection reminders", Icon: Icons.BellRinging, tint: colors.brand, tintBg: colors.brandSoft },
  //{ title: "Settings", subtitle: "App preferences", Icon: Icons.GearSix, tint: colors.success, tintBg: colors.successSoft },
  //{ title: "Privacy Policy", subtitle: "How we handle data", Icon: Icons.ShieldCheck, tint: colors.warning, tintBg: colors.warningSoft },
  { title: "Logout", subtitle: "Sign out of your account", Icon: Icons.SignOut, tint: colors.danger, tintBg: colors.dangerSoft, action: "logout" },
];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setUser, logout: handleLogout } = useAuth();

  const initials = (user?.vendorName || "Vendor")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const onPress = (opt: Option) => {
    Haptics.selectionAsync();
    if (opt.action === "logout") return handleLogout();
    if (opt.route) router.push(opt.route as any);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* HERO */}
        <LinearGradient colors={gradients.candy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 24 }]}>
          <View style={styles.heroBlob} />

          <TouchableOpacity onPress={handleLogout} style={{ position: 'absolute', top: insets.top + 16, right: 20, zIndex: 10 }}>
            <GlassSurface intensity="chip" tint="dark" borderRadius={14} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } as any}>
              <Icons.SignOut size={24} color="#fff" weight="bold" />
            </GlassSurface>
          </TouchableOpacity>

          <Animated.View entering={ZoomIn.duration(600)}>
            <GlassSurface intensity="hero" tint="dark" borderRadius={30} style={styles.avatar as any}>
              <Text style={styles.avatarText}>{initials || "MH"}</Text>
            </GlassSurface>
          </Animated.View>
          <Text style={styles.name} numberOfLines={1}>{user?.vendorName || "Emami Vendor"}</Text>
          <Text style={styles.email} numberOfLines={1}>{user?.Email || "vendor@emami.com"}</Text>
          <GlassSurface intensity="chip" tint="dark" borderRadius={radius.pill} style={styles.badge as any}>
            <Icons.SealCheck size={14} color="#fff" weight="fill" />
            <Text style={styles.badgeText}>Vendor {user?.vendorCode || ""}</Text>
          </GlassSurface>
        </LinearGradient>

        {/* OPTIONS */}
        <View style={styles.options}>
          {OPTIONS.map((opt, i) => (
            <Animated.View key={opt.title} entering={FadeInDown.delay(i * 70).duration(450)}>
              <TouchableOpacity activeOpacity={0.85} style={[styles.optionCard, shadow.soft]} onPress={() => onPress(opt)}>
                <View style={[styles.optIcon, { backgroundColor: opt.tintBg }]}>
                  <opt.Icon size={22} color={opt.tint} weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optTitle, opt.action === "logout" && { color: colors.danger }]}>{opt.title}</Text>
                  <Text style={styles.optSub}>{opt.subtitle}</Text>
                </View>
                <Icons.CaretRight size={18} color={colors.textFaint} weight="bold" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Text style={styles.version}>MouldHealth v{APP_VERSION} · {APP_DEPT}</Text>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },
  heroBlob: { position: "absolute", width: 220, height: 220, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.10)", top: -100, left: -50 },
  avatar: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: font.black },
  name: { color: "#fff", fontSize: 22, fontWeight: font.black, marginTop: 14, letterSpacing: -0.4 },
  email: { color: "rgba(255,255,255,0.9)", fontSize: font.sub, fontWeight: font.medium, marginTop: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 30,
    marginTop: 12,
  },
  badgeText: { color: "#fff", fontSize: font.caption, fontWeight: font.bold },

  options: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius._20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  optIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  optTitle: { fontSize: font.title, fontWeight: font.bold, color: colors.ink },
  optSub: { fontSize: font.caption, color: colors.textMuted, marginTop: 2 },
  version: { textAlign: "center", color: colors.textFaint, fontSize: font.caption, fontWeight: font.medium, marginTop: 22 },
});

// import React from "react";
// import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
// import { LinearGradient } from "expo-linear-gradient";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { StatusBar } from "expo-status-bar";
// import { useRouter } from "expo-router";
// import * as Icons from "phosphor-react-native";
// import * as Haptics from "expo-haptics";
// import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

// import { useAuth } from "@/contexts/AuthContext";
// import { colors, font, radius, gradients, shadow } from "@/constants/theme";
// import { APP_VERSION, APP_DEPT } from "@/lib/config";

// type Option = {
//   title: string;
//   subtitle: string;
//   Icon: Icons.Icon;
//   tint: string;
//   tintBg: string;
//   route?: string;
//   action?: "logout";
// };

// const OPTIONS: Option[] = [
//   { title: "Edit Profile", subtitle: "Update your details", Icon: Icons.UserGear, tint: colors.info, tintBg: colors.infoSoft, route: "/(modals)/profileModal" },
//   { title: "Notifications", subtitle: "Inspection reminders", Icon: Icons.BellRinging, tint: colors.brand, tintBg: colors.brandSoft },
//   { title: "Settings", subtitle: "App preferences", Icon: Icons.GearSix, tint: colors.success, tintBg: colors.successSoft },
//   { title: "Privacy Policy", subtitle: "How we handle data", Icon: Icons.ShieldCheck, tint: colors.warning, tintBg: colors.warningSoft },
//   { title: "Logout", subtitle: "Sign out of your account", Icon: Icons.SignOut, tint: colors.danger, tintBg: colors.dangerSoft, action: "logout" },
// ];

// export default function Profile() {
//   const router = useRouter();
//   const insets = useSafeAreaInsets();
//   const { user, setUser } = useAuth();

//   const initials = (user?.vendorName || "Vendor")
//     .split(" ")
//     .slice(0, 2)
//     .map((w) => w[0])
//     .join("")
//     .toUpperCase();

//   const logout = () => {
//     Alert.alert("Logout", "Are you sure you want to sign out?", [
//       { text: "Cancel", style: "cancel" },
//       {
//         text: "Logout",
//         style: "destructive",
//         onPress: () => {
//           setUser(null);
//           router.replace("/(auth)/welcome");
//         },
//       },
//     ]);
//   };

//   const onPress = (opt: Option) => {
//     Haptics.selectionAsync();
//     if (opt.action === "logout") return logout();
//     if (opt.route) router.push(opt.route as any);
//   };

//   return (
//     <View style={styles.root}>
//       <StatusBar style="light" />
//       <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
//         {/* HERO */}
//         <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 24 }]}>
//           <View style={styles.heroBlob} />
//           <Animated.View entering={ZoomIn.duration(600)} style={styles.avatar}>
//             <Text style={styles.avatarText}>{initials || "MH"}</Text>
//           </Animated.View>
//           <Text style={styles.name} numberOfLines={1}>{user?.vendorName || "Emami Vendor"}</Text>
//           <Text style={styles.email} numberOfLines={1}>{user?.Email || "vendor@emami.com"}</Text>
//           <View style={styles.badge}>
//             <Icons.SealCheck size={14} color="#fff" weight="fill" />
//             <Text style={styles.badgeText}>Vendor {user?.vendorCode || ""}</Text>
//           </View>
//         </LinearGradient>

//         {/* OPTIONS */}
//         <View style={styles.options}>
//           {OPTIONS.map((opt, i) => (
//             <Animated.View key={opt.title} entering={FadeInDown.delay(i * 70).duration(450)}>
//               <TouchableOpacity activeOpacity={0.85} style={[styles.optionCard, shadow.soft]} onPress={() => onPress(opt)}>
//                 <View style={[styles.optIcon, { backgroundColor: opt.tintBg }]}>
//                   <opt.Icon size={22} color={opt.tint} weight="duotone" />
//                 </View>
//                 <View style={{ flex: 1 }}>
//                   <Text style={[styles.optTitle, opt.action === "logout" && { color: colors.danger }]}>{opt.title}</Text>
//                   <Text style={styles.optSub}>{opt.subtitle}</Text>
//                 </View>
//                 <Icons.CaretRight size={18} color={colors.textFaint} weight="bold" />
//               </TouchableOpacity>
//             </Animated.View>
//           ))}
//         </View>

//         <Text style={styles.version}>MouldHealth v{APP_VERSION} · {APP_DEPT}</Text>
//       </Animated.ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: colors.bg },
//   hero: {
//     alignItems: "center",
//     paddingHorizontal: 20,
//     paddingBottom: 28,
//     borderBottomLeftRadius: 30,
//     borderBottomRightRadius: 30,
//     overflow: "hidden",
//   },
//   heroBlob: { position: "absolute", width: 220, height: 220, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.10)", top: -100, left: -50 },
//   avatar: {
//     width: 92,
//     height: 92,
//     borderRadius: 30,
//     backgroundColor: "rgba(255,255,255,0.2)",
//     borderWidth: 2,
//     borderColor: "rgba(255,255,255,0.4)",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   avatarText: { color: "#fff", fontSize: 32, fontWeight: font.black },
//   name: { color: "#fff", fontSize: 22, fontWeight: font.black, marginTop: 14, letterSpacing: -0.4 },
//   email: { color: "rgba(255,255,255,0.9)", fontSize: font.sub, fontWeight: font.medium, marginTop: 4 },
//   badge: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     backgroundColor: "rgba(255,255,255,0.2)",
//     paddingHorizontal: 14,
//     height: 30,
//     borderRadius: radius.pill,
//     marginTop: 12,
//   },
//   badgeText: { color: "#fff", fontSize: font.caption, fontWeight: font.bold },

//   options: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
//   optionCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 14,
//     backgroundColor: colors.surface,
//     borderRadius: radius._20,
//     borderWidth: 1,
//     borderColor: colors.border,
//     padding: 14,
//   },
//   optIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
//   optTitle: { fontSize: font.title, fontWeight: font.bold, color: colors.ink },
//   optSub: { fontSize: font.caption, color: colors.textMuted, marginTop: 2 },
//   version: { textAlign: "center", color: colors.textFaint, fontSize: font.caption, fontWeight: font.medium, marginTop: 22 },
// });
