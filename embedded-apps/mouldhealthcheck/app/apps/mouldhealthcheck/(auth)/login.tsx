import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Icons from "phosphor-react-native";
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader from "@/components/ui/AppHeader";
import Field from "@/components/ui/Field";
import GlassCard from "@/components/ui/GlassCard";
import GlassSurface from "@/components/ui/GlassSurface";
import GradientButton from "@/components/ui/GradientButton";
import { colors, font, gradients, radius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/config";
import { useBreakpoint } from "@/utils/responsive";

const LOGO_BASE64 = 'data:image/png;base64,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';

export default function Login() {
  const router = useRouter();
  const { setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { isPhone, isTablet } = useBreakpoint();

  // Determine which login role is selected
  const [loginType, setLoginType] = useState<"User" | "Admin">("User");

  // Unified Form States for both roles
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cross-Platform Feedback Modal State
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message: string; type: "success" | "error" | null }>({
    visible: false,
    title: "",
    message: "",
    type: null,
  });

  const showError = (title: string, message: string) => {
    setFeedback({ visible: true, title, message, type: "error" });
  };

  const showSuccess = (title: string, message: string) => {
    setFeedback({ visible: true, title, message, type: "success" });
  };

  // STEP 1: Handle Sending OTP (Shared)
  const handleSendOtp = async () => {
    if (!email.trim()) {
      showError("Missing Email", "Please enter your email address first.");
      return;
    }
    setLoading(true);
    console.log(`Requesting ${loginType} OTP for email:`, email);

    try {
      // Call SAP directly via API Gateway using entity format
      const { data } = await api.get(`/ZMM_MOULD_CARE_SRV/ZmouldLoginSet(Email='${email.trim()}')`, {
        params: {
          $format: "json"
        }
      });

      const user = data?.d?.results ? data.d.results[0] : data?.d;
      if (user) {
        setIsOtpSent(true);
        showSuccess("OTP Sent", "A one-time password has been successfully sent to your email.");
      } else {
        showError("Error", "User not found or could not send OTP.");
      }

    } catch (e: any) {
      console.error("OTP Error:", e);
      showError("Error", e.message || "Could not send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Handle Final Login (Shared)
  const handleLogin = async () => {
    if (!otp.trim()) {
      showError("Missing OTP", "Please enter the OTP sent to your email.");
      return;
    }
    if (!email.trim()) {
      showError("Missing Email", "Please enter your email address.");
      return;
    }

    setLoading(true);
    console.log(`Attempting ${loginType} login with email:`, email);

    try {
      // EXACT LIVE BACKEND MAPPING PRESERVED
      const payload = {
        Otp: otp.trim(),
        Email: email.trim()
      };
      const res = await api.post("/ZMM_MOULD_CARE_SRV/ZmouldLoginSet", payload);

      console.log("SAP Response:", res.data);
     const user = res.data?.d || res.data?.user;
      console.log("USER FOUND:", user);

      if (user.Role === "Admin" || user.Role === "User") {
// Extract the role cleanly from the response (handles both SAP 'Role' and Node 'role')
        const backendRole = user.Role || user.role;

        // CRITICAL ROLE ENFORCEMENT:
        // Ensure the role from the backend matches the user's selected tab selection
        if (loginType === "Admin" && backendRole !== "Admin") {
          showError("Access Denied", "This account does not have Admin privileges.");
          return;
        }

        if (loginType === "User" && backendRole === "Admin") {
          showError("Access Denied", "Admin accounts must log in through the Admin panel.");
          return;
        }

        // Keep the user object along with the role provided by the backend response
        const finalUser = { ...user, Role: backendRole };
        console.log("FINAL USER:", finalUser);

        setUser(finalUser);
        router.replace("/apps/mouldhealthcheck/(tabs)");
      } else {
        showError("Login Failed", "Invalid Otp or Email. Please check your credentials and try again.");
      }
    } catch (e) {
      console.error("Login Error:", e);
      showError("Login Failed", "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  // Reset the OTP flow when switching between User and Admin tabs
  const handleTabSwitch = (type: "User" | "Admin") => {
    if (loginType !== type) {
      setLoginType(type);
      setOtp("");
      setIsOtpSent(false);
    }
  };

  const cardWidth = isPhone ? "100%" : isTablet ? 460 : 520;

  const FeedbackModal = (
    <Modal visible={feedback.visible} transparent={true} animationType="fade" onRequestClose={() => setFeedback({ ...feedback, visible: false })}>
      <View style={styles.modalOverlay}>
        <GlassSurface intensity="modal" tint="light" borderRadius={radius._20} style={styles.modalContent as any}>
          <View style={styles.modalHeader}>
            {feedback.type === "success" ? (
              <Icons.CheckCircle size={32} color={colors.success} weight="fill" />
            ) : (
              <Icons.XCircle size={32} color={colors.danger} weight="fill" />
            )}
            <Text style={styles.modalTitle}>{feedback.title}</Text>
          </View>

          <Text style={styles.modalMessage}>{feedback.message}</Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtnApprove, { backgroundColor: feedback.type === 'success' ? colors.success : colors.danger }]}
              onPress={() => setFeedback({ ...feedback, visible: false })}
            >
              <Text style={styles.modalBtnApproveText}>OK</Text>
            </TouchableOpacity>
          </View>
        </GlassSurface>
      </View>
    </Modal>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Colorful gradient backdrop + soft blobs — one layout for every breakpoint. */}
      <LinearGradient colors={gradients.candy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, styles.blobPink]} />
      <View style={[styles.blob, styles.blobBlue]} />

      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <AppHeader back light />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scrollArea, { paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={ZoomIn.duration(500)} style={{ width: "100%", alignItems: "center" }}>
            <GlassCard intensity="hero" tint="dark" style={[styles.card, { width: cardWidth, maxWidth: "100%" }]}>
              <Animated.View entering={ZoomIn.duration(500)} style={styles.logoCard}>
                <Image source={{ uri: LOGO_BASE64 }} style={styles.logo} resizeMode="contain" />
              </Animated.View>
              <Animated.Text entering={FadeInDown.delay(120).duration(500)} style={styles.title}>
                Welcome back 👋
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
                Sign in to continue your inspections
              </Animated.Text>

              <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.form}>
                {/* TOGGLE TABS (USER vs ADMIN) */}
                <View style={styles.tabContainer}>
                  <Pressable
                    style={[styles.tab, loginType === "User" && styles.activeTab]}
                    onPress={() => handleTabSwitch("User")}
                  >
                    <Text style={[styles.tabText, loginType === "User" && styles.activeTabText]}>User</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.tab, loginType === "Admin" && styles.activeTab]}
                    onPress={() => handleTabSwitch("Admin")}
                  >
                    <Text style={[styles.tabText, loginType === "Admin" && styles.activeTabText]}>Admin</Text>
                  </Pressable>
                </View>

                {/* SHARED EMAIL FIELD */}
                <Field
                  label={loginType === "Admin" ? "Admin Email" : "Email"}
                  placeholder="you@emami.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading && !isOtpSent}
                  icon={<Icons.At size={22} color={colors.brand} weight="bold" />}
                  onSubmitEditing={!isOtpSent ? handleSendOtp : undefined}
                  returnKeyType={!isOtpSent ? "send" : "next"}
                />

                {/* SHARED OTP FIELD (Only appears after Send OTP is clicked) */}
                {isOtpSent && (
                  <Animated.View entering={FadeInDown.duration(400)}>
                    <Field
                      label="OTP"
                      placeholder="Enter the 6-digit OTP"
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                      editable={!loading}
                      icon={<Icons.Key size={22} color={colors.brand} weight="bold" />}
                      onSubmitEditing={handleLogin}
                      returnKeyType="go"
                    />
                    <TouchableOpacity onPress={handleSendOtp} disabled={loading} style={{ alignSelf: 'flex-end', marginTop: 12 }}>
                      <Text style={{ color: "#fff", fontSize: font.sub, fontWeight: font.bold, opacity: loading ? 0.5 : 1 }}>
                        Resend OTP
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {/* DYNAMIC BUTTON */}
                <GradientButton
                  title={isOtpSent ? "Login" : "Send OTP"}
                  loading={loading}
                  onPress={isOtpSent ? handleLogin : handleSendOtp}
                  icon={
                    isOtpSent ? (
                      <Icons.SignIn size={20} color="#fff" weight="bold" />
                    ) : (
                      <Icons.PaperPlaneRight size={20} color="#fff" weight="bold" />
                    )
                  }
                />
              </Animated.View>
            </GlassCard>

            <Text style={styles.footerText}>© 2026 Mold Inspection Portal - Emami Limited. All rights reserved.</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {FeedbackModal}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  blob: { position: "absolute", borderRadius: 999 },
  blobPink: { width: 320, height: 320, backgroundColor: "rgba(236,72,153,0.28)", top: "-6%", left: "-10%" },
  blobBlue: { width: 300, height: 300, backgroundColor: "rgba(45,127,249,0.26)", bottom: "-4%", right: "-8%" },
  scrollArea: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 22 },
  card: { padding: 32, alignItems: "center" },
  logoCard: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 64, height: 64 },
  title: { color: "#fff", fontSize: font.h3, fontWeight: font.black, marginTop: 14, textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: font.body, fontWeight: font.medium, marginTop: 6, textAlign: "center" },
  form: { width: "100%", marginTop: 24, gap: 16 },

  // Tab Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: font.body,
    fontWeight: font.medium,
    color: "rgba(255,255,255,0.8)",
  },
  activeTabText: {
    color: colors.brand,
    fontWeight: font.bold,
  },

  footerText: {
    marginTop: 24,
    color: "rgba(255,255,255,0.65)",
    fontSize: font.micro,
    fontWeight: font.medium,
    textAlign: "center",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: font.title,
    fontWeight: font.black,
    color: colors.ink,
  },
  modalMessage: {
    fontSize: font.body,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtnApprove: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius._12,
  },
  modalBtnApproveText: {
    fontSize: font.body,
    fontWeight: font.bold,
    color: "#fff",
  },
});


//Start of latest code
// import { LinearGradient } from "expo-linear-gradient";
// import { useRouter } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import * as Icons from "phosphor-react-native";
// import React, { useState } from "react";
// import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
// import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import AppHeader from "@/components/ui/AppHeader";
// import Field from "@/components/ui/Field";
// import GradientButton from "@/components/ui/GradientButton";
// import { colors, font, gradients } from "@/constants/theme";
// import { useAuth } from "@/contexts/AuthContext";
// import { api } from "@/lib/config";

// export default function Login() {
//   const router = useRouter();
//   const { setUser } = useAuth();
//   const insets = useSafeAreaInsets();

//   const [email, setEmail] = useState("");
//   const [otp, setOtp] = useState(""); // Replaced password with OTP
//   const [isOtpSent, setIsOtpSent] = useState(false); // Track UI state
//   const [loading, setLoading] = useState(false);

//   // STEP 1: Handle Sending OTP
//   const handleSendOtp = async () => {
//     if (!email.trim()) {
//       Alert.alert("Login", "Please enter your email address.");
//       return;
//     }
//     setLoading(true);
//     console.log("Requesting OTP for email:", email);

//     try {
//       // TODO: Replace this timeout with your actual API call to send the OTP
//       // await api.post("/send-otp", { email: email.trim() });

//       setTimeout(() => {
//         setIsOtpSent(true);
//         setLoading(false);
//       }, 1000); // Simulating network request

//     } catch (e) {
//       console.error("OTP Error:", e);
//       Alert.alert("Error", "Could not send OTP. Try again.");
//       setLoading(false);
//     }
//   };

//   // STEP 2: Handle Final Login
//   const handleLogin = async () => {
//     if (!otp.trim()) {
//       Alert.alert("Login", "Please enter the OTP sent to your email.");
//       return;
//     }

//     setLoading(true);
//     console.log("Attempting login with email:", email, "and OTP:", otp);

//     try {
//       // Keeping your existing SAP login logic
//       const { data } = await api.get("/ZmouldLoginSet", {
//         params: {
//           "$filter": `Email eq '${email.trim()}'`,
//           "$format": "json"
//         }
//       });

//       console.log("SAP Response:", data);
//       const user = data?.d?.results?.[0];
//       console.log("USER FOUND:", user);

//       if (user) {
//         // NOTE: Make sure to also validate the OTP via API here if required by your backend
//         setUser(user);
//         router.replace("/(tabs)");
//       } else {
//         Alert.alert("Login Failed", "User not found in SAP");
//       }
//     } catch (e) {
//       console.error("Login Error:", e);
//       Alert.alert("Login Failed", "Could not reach the server.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.root}>
//       <StatusBar style="light" />

//       {/* HERO HEADER */}
//       <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
//         <View style={styles.blob} />
//         <View style={{ paddingTop: insets.top }}>
//           <AppHeader back light />
//         </View>
//         <Animated.View entering={ZoomIn.duration(600)} style={styles.logoCard}>
//           <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
//         </Animated.View>
//         <Animated.Text entering={FadeInDown.delay(150).duration(600)} style={styles.title}>
//           Welcome back 👋
//         </Animated.Text>
//         <Animated.Text entering={FadeInDown.delay(250).duration(600)} style={styles.subtitle}>
//           Sign in to continue your inspections
//         </Animated.Text>
//       </LinearGradient>

//       {/* FORM */}
//       <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
//         <ScrollView
//           contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 30 }}
//           keyboardShouldPersistTaps="handled"
//           showsVerticalScrollIndicator={false}
//         >
//           <Animated.View entering={FadeInDown.delay(300).duration(600)} style={{ gap: 16 }}>

//             {/* EMAIL FIELD */}
//             <Field
//               label="Email"
//               placeholder="you@emami.com"
//               autoCapitalize="none"
//               keyboardType="email-address"
//               value={email}
//               onChangeText={setEmail}
//               editable={!loading} // Prevent changes while loading
//               icon={<Icons.At size={22} color={colors.brand} weight="bold" />}
//             />

//             {/* OTP FIELD (Only visible after OTP is sent) */}
//             {isOtpSent && (
//               <Animated.View entering={FadeInDown.duration(400)}>
//                 <Field
//                   label="OTP"
//                   placeholder="Enter the 6-digit OTP"
//                   keyboardType="number-pad"
//                   value={otp}
//                   onChangeText={setOtp}
//                   editable={!loading}
//                   icon={<Icons.Key size={22} color={colors.brand} weight="bold" />}
//                 />
//               </Animated.View>
//             )}

//             {/* DYNAMIC BUTTON */}
//             <View style={{ marginTop: 6 }}>
//               <GradientButton
//                 title={isOtpSent ? "Login" : "Send OTP"}
//                 loading={loading}
//                 onPress={isOtpSent ? handleLogin : handleSendOtp}
//                 icon={
//                   isOtpSent ? (
//                     <Icons.SignIn size={20} color="#fff" weight="bold" />
//                   ) : (
//                     <Icons.PaperPlaneRight size={20} color="#fff" weight="bold" />
//                   )
//                 }
//               />
//             </View>

//           </Animated.View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: colors.bg },
//   hero: {
//     paddingBottom: 34,
//     borderBottomLeftRadius: 36,
//     borderBottomRightRadius: 36,
//     alignItems: "center",
//     overflow: "hidden",
//   },
//   blob: { position: "absolute", width: 200, height: 200, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.10)", top: -70, right: -50 },
//   logoCard: {
//     width: 84,
//     height: 84,
//     borderRadius: 24,
//     backgroundColor: "rgba(255,255,255,0.18)",
//     alignItems: "center",
//     justifyContent: "center",
//     marginTop: 6,
//   },
//   logo: { width: 60, height: 60 },
//   title: { color: "#fff", fontSize: 24, fontWeight: font.black, marginTop: 14 },
//   subtitle: { color: "rgba(255,255,255,0.9)", fontSize: font.body, fontWeight: font.medium, marginTop: 6 },
// });
//End of latest code

// import React, { useState } from "react";
// import { View, Text, StyleSheet, Alert, Pressable, KeyboardAvoidingView, Platform, ScrollView, Image } from "react-native";
// import { StatusBar } from "expo-status-bar";
// import { LinearGradient } from "expo-linear-gradient";
// import { useRouter } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
// import * as Icons from "phosphor-react-native";

// import { useAuth } from "@/contexts/AuthContext";
// import { api } from "@/lib/config";
// import { colors, gradients, font } from "@/constants/theme";
// import Field from "@/components/ui/Field";
// import GradientButton from "@/components/ui/GradientButton";
// import AppHeader from "@/components/ui/AppHeader";
// import axios from "axios";

// export default function Login() {
//   const router = useRouter();
//   const { setUser } = useAuth();
//   const insets = useSafeAreaInsets();

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleLogin = async () => {
//     if (!email.trim()) {
//       Alert.alert("Login", "Please enter your email address.");
//       return;
//     }
//     setLoading(true);
//     console.log("Attempting login with email:", email);
//     try {
//       const { data } = await api.get("/login", { params: { Email: email } });
//       console.log("Login response:", data);
//       if (data?.user?.Email?.toLowerCase() === email.trim().toLowerCase()) {
//         setUser(data.user);
//         router.replace("/(tabs)");
//       } else {
//         Alert.alert("Login Failed", "We couldn't find an account for that email.");
//       }
//     } catch (e) {
//       Alert.alert("Login Failed", "Could not reach the server. Check your connection and try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.root}>
//       <StatusBar style="light" />

//       {/* HERO HEADER */}
//       <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
//         <View style={styles.blob} />
//         <View style={{ paddingTop: insets.top }}>
//           <AppHeader back light />
//         </View>
//         <Animated.View entering={ZoomIn.duration(600)} style={styles.logoCard}>
//           <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
//         </Animated.View>
//         <Animated.Text entering={FadeInDown.delay(150).duration(600)} style={styles.title}>
//           Welcome back 👋
//         </Animated.Text>
//         <Animated.Text entering={FadeInDown.delay(250).duration(600)} style={styles.subtitle}>
//           Sign in to continue your inspections
//         </Animated.Text>
//       </LinearGradient>

//       {/* FORM */}
//       <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
//         <ScrollView
//           contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 30 }}
//           keyboardShouldPersistTaps="handled"
//           showsVerticalScrollIndicator={false}
//         >
//           <Animated.View entering={FadeInDown.delay(300).duration(600)} style={{ gap: 16 }}>
//             <Field
//               label="Email"
//               placeholder="you@emami.com"
//               autoCapitalize="none"
//               keyboardType="email-address"
//               value={email}
//               onChangeText={setEmail}
//               icon={<Icons.At size={22} color={colors.brand} weight="bold" />}
//             />
//             <Field
//               label="Password"
//               placeholder="Enter your password"
//               password
//               value={password}
//               onChangeText={setPassword}
//               icon={<Icons.Lock size={22} color={colors.brand} weight="bold" />}
//             />

//             <View style={{ marginTop: 6 }}>
//               <GradientButton
//                 title="Login"
//                 loading={loading}
//                 onPress={handleLogin}
//                 icon={<Icons.SignIn size={20} color="#fff" weight="bold" />}
//               />
//             </View>
//           </Animated.View>

//           <Pressable style={styles.footer} onPress={() => router.push("/(auth)/register")}>
//             <Text style={styles.footerText}>New to MouldHealth? </Text>
//             <Text style={styles.footerLink}>Create an account</Text>
//           </Pressable>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: colors.bg },
//   hero: {
//     paddingBottom: 34,
//     borderBottomLeftRadius: 36,
//     borderBottomRightRadius: 36,
//     alignItems: "center",
//     overflow: "hidden",
//   },
//   blob: { position: "absolute", width: 200, height: 200, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.10)", top: -70, right: -50 },
//   logoCard: {
//     width: 84,
//     height: 84,
//     borderRadius: 24,
//     backgroundColor: "rgba(255,255,255,0.18)",
//     alignItems: "center",
//     justifyContent: "center",
//     marginTop: 6,
//   },
//   logo: { width: 60, height: 60 },
//   title: { color: "#fff", fontSize: 24, fontWeight: font.black, marginTop: 14 },
//   subtitle: { color: "rgba(255,255,255,0.9)", fontSize: font.body, fontWeight: font.medium, marginTop: 6 },
//   footer: { flexDirection: "row", justifyContent: "center", marginTop: 26 },
//   footerText: { color: colors.textMuted, fontSize: font.body, fontWeight: font.medium },
//   footerLink: { color: colors.brand, fontSize: font.body, fontWeight: font.bold },
// });
