import GlassChip from "@/components/ui/GlassChip";
import GlassSurface from "@/components/ui/GlassSurface";
import { colors, font, gradients, radius, shadow } from "@/constants/theme";
import { api } from "@/lib/config";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Message = {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
};

export default function FloatingChat() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hi! Welcome to Mold Inspection. I am your AI Assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);

  const flatListRef = useRef<FlatList>(null);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [isListening, setIsListening] = useState(false);

  // Animation for opening/closing the chat window
  useEffect(() => {
    if (isOpen) {
      scale.value = withSpring(1, { damping: 20, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isOpen]);

  const startListening = () => {
    if (Platform.OS !== "web") {
      alert("Speech recognition is currently only supported on the web.");
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      handleSend(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const animatedWindowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: (1 - scale.value) * 100 }] as any,
    opacity: opacity.value,
  }));

  const handleSend = async (forcedText?: string | any) => {
    const text = typeof forcedText === 'string' ? forcedText.trim() : inputText.trim();
    if (!text) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText("");
    Keyboard.dismiss();

    // 1. Add User Message
    const userMsg: Message = { id: Date.now().toString(), text, isBot: false, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    // 2. Check for basic greetings and local questions
    const lowerText = text.toLowerCase();
    
    const addBotMessage = (msg: string) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text: msg, isBot: true, timestamp: new Date() },
      ]);
    };

    if (["hi", "hello", "hey", "good morning", "good evening"].some((g) => lowerText.includes(g))) {
      setTimeout(() => addBotMessage("Hello! How can I assist you with your inspection tasks today?"), 600);
      return;
    }
    
    if (lowerText.includes("how are you")) {
      setTimeout(() => addBotMessage("I'm functioning perfectly! Ready to help you with your moulds."), 600);
      return;
    }

    if (lowerText.includes("how to inspect") || lowerText.includes("complete the process")) {
       setTimeout(() => addBotMessage("Here is the step-by-step flow:\n1. Go to your Dashboard.\n2. Select an assigned mould and click 'Start Inspection'.\n3. Follow the guided checklist for each subsystem.\n4. Upload photos and add remarks.\n5. Click 'Submit' to send the report for admin approval."), 600);
       return;
    }

    if (lowerText.includes("how") && lowerText.includes("inspect")) {
       setTimeout(() => addBotMessage("To start an inspection, go to your Dashboard and click 'Start Inspection' on any of your assigned moulds."), 600);
       return;
    }

    if (lowerText.includes("report") || lowerText.includes("status")) {
       setTimeout(() => addBotMessage("You can view the status of your reports directly on the Dashboard. Admin-approved reports will feature a green badge."), 600);
       return;
    }

    if (lowerText.includes("thank")) {
       setTimeout(() => addBotMessage("You're very welcome! Let me know if you need anything else."), 600);
       return;
    }

    // 3. OData Backend Call for complex questions
    setLoading(true);
    try {
      const res = await api.get("/ZMM_MOULD_CARE_SRV/ZChatbotQuerySet", {
        params: {
          $filter: `Question eq '${encodeURIComponent(text)}'`,
          $format: "json",
        },
      });

      // Assuming SAP returns the answer in a field called 'Answer'
      const answer = res.data?.d?.results?.[0]?.Answer || "I'm sorry, I couldn't find an answer to that in the system.";

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text: answer, isBot: true, timestamp: new Date() },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text: "Sorry, I'm having trouble connecting to the server right now. 😔", isBot: true, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON (Always Visible) */}
      <TouchableOpacity
        style={[styles.fab, shadow.card, { bottom: insets.bottom + 20 }]}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.selectionAsync();
          setIsOpen(true);
        }}
      >
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
          <Icons.Robot size={32} color="#fff" weight="duotone" />
        </LinearGradient>
      </TouchableOpacity>

      {/* CHAT WINDOW (True Floating Widget without Modal) */}
      {isOpen && (
        <Animated.View style={[styles.chatWindow, shadow.floating, animatedWindowStyle, { bottom: insets.bottom + 90 }]}>
          <GlassSurface intensity="card" tint="light" borderRadius={radius._20} style={styles.chatWindowSurface as any}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            {/* Header */}
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
              <View style={styles.headerIconWrap}>
                <Icons.Robot size={22} color={colors.brand} weight="duotone" />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>AI Assistant</Text>
                <Text style={styles.headerSub}>Online · Ask me anything</Text>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} activeOpacity={0.8}>
                <GlassChip size={32} tint="dark" style={styles.closeBtn}>
                  <Icons.X size={18} color="#fff" weight="bold" />
                </GlassChip>
              </TouchableOpacity>
            </LinearGradient>

            {/* Message List */}
            <FlatList
              ref={flatListRef}
              style={{ flex: 1 }}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item, index }) => {
                const isBot = item.isBot;
                return (
                  <Animated.View
                    entering={FadeInDown.delay(index === messages.length - 1 ? 100 : 0)}
                    style={[styles.msgWrapper, isBot ? styles.msgWrapperBot : styles.msgWrapperUser]}
                  >
                    {isBot && (
                      <View style={styles.botAvatar}>
                        <Icons.Robot size={16} color="#fff" weight="fill" />
                      </View>
                    )}
                    <View style={[styles.msgBubble, isBot ? styles.msgBubbleBot : styles.msgBubbleUser]}>
                      <Text style={[styles.msgText, isBot ? styles.msgTextBot : styles.msgTextUser]}>{item.text}</Text>
                    </View>
                  </Animated.View>
                );
              }}
            />

            {/* Loading Indicator */}
            {loading && (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.typingText}>Assistant is typing...</Text>
              </View>
            )}

            {/* Quick Replies */}
            {!loading && messages.length > 0 && messages[messages.length - 1].isBot && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReplyContainer} contentContainerStyle={styles.quickReplyContent}>
                {["How to inspect?", "Complete the process", "Report status"].map((qr, i) => (
                  <TouchableOpacity key={i} style={styles.quickReplyChip} onPress={() => { setInputText(""); handleSend(qr); }}>
                    <Text style={styles.quickReplyText}>{qr}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Input Area */}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Type your question..."
                placeholderTextColor={colors.textFaint}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={startListening}
                style={[styles.micBtn, isListening && { backgroundColor: colors.danger }]}
                disabled={isListening}
              >
                <Icons.Microphone size={18} color={isListening ? "#fff" : colors.brand} weight={isListening ? "fill" : "bold"} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSend}
                style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
                disabled={!inputText.trim() || loading}
              >
                <Icons.PaperPlaneRight size={18} color="#fff" weight="fill" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
          </GlassSurface>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: { position: "absolute", right: 20, zIndex: 9999 },
  fabGradient: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },

  chatWindow: {
    position: "absolute",
    right: 20,
    width: 340,
    height: 500,
    maxHeight: "75%",
    zIndex: 10000,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : {}),
  },
  chatWindowSurface: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  headerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: font.body, fontWeight: font.bold },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: font.micro, fontWeight: font.medium, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16 },

  chatList: { padding: 16, flexGrow: 1, justifyContent: "flex-end" },
  msgWrapper: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end" },
  msgWrapperBot: { justifyContent: "flex-start", paddingRight: 40 },
  msgWrapperUser: { justifyContent: "flex-end", paddingLeft: 40 },
  
  botAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginRight: 8 },
  msgBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius._17, flexShrink: 1 },
  msgBubbleBot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  msgBubbleUser: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  
  msgText: { fontSize: font.sub, lineHeight: 20 },
  msgTextBot: { color: colors.ink, fontWeight: font.medium },
  msgTextUser: { color: "#fff", fontWeight: font.semibold },

  typingIndicator: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
  typingText: { fontSize: font.caption, color: colors.textMuted, fontStyle: "italic" },

  inputWrap: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, height: 44, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 16, fontSize: font.sub, color: colors.ink, borderWidth: 1, borderColor: colors.border, outlineStyle: 'none' as any },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  
  quickReplyContainer: { maxHeight: 54, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  quickReplyContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  quickReplyChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "rgba(255, 138, 43, 0.1)", borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255, 138, 43, 0.3)" },
  quickReplyText: { fontSize: font.caption, color: colors.brand, fontWeight: font.bold },
});