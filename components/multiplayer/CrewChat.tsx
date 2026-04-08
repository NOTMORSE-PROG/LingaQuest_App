import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { useMultiplayerStore } from "@/stores/multiplayer";
import { useAuthStore } from "@/stores/auth";
import { apiClient } from "@/lib/api";
import { ChatMessage } from "@/types";

interface CrewChatProps {
  roomId: string;
}

const MAX_LEN = 300;

function avatarColor(userId: string): string {
  // Stable hash → one of the pirate palette colors
  const palette = ["#f5c518", "#e94560", "#22c55e", "#3b82f6", "#a855f7", "#fb923c"];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function initial(name: string): string {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function MessageBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  const safeName = (msg.userName ?? "Sailor").replace(/[\r\n]/g, " ").slice(0, 24);
  return (
    <View
      style={{
        flexDirection: "row",
        marginVertical: 4,
        paddingHorizontal: 12,
        justifyContent: isMe ? "flex-end" : "flex-start",
      }}
    >
      {!isMe && (
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: avatarColor(msg.userId),
            alignItems: "center",
            justifyContent: "center",
            marginRight: 6,
            marginTop: 2,
          }}
          accessible
          accessibilityLabel={`${safeName} avatar`}
        >
          <Text style={{ color: "#1a1a2e", fontWeight: "800", fontSize: 13 }}>
            {initial(safeName)}
          </Text>
        </View>
      )}
      <View
        style={{
          maxWidth: "75%",
          backgroundColor: isMe ? "#e94560" : "#16213e",
          borderColor: isMe ? "#ff6b8a" : "#0f3460",
          borderWidth: 1,
          borderRadius: 14,
          borderTopLeftRadius: isMe ? 14 : 4,
          borderTopRightRadius: isMe ? 4 : 14,
          paddingHorizontal: 12,
          paddingVertical: 8,
          opacity: msg.pending ? 0.6 : 1,
        }}
      >
        {!isMe && (
          <Text style={{ color: "#f5c518", fontWeight: "700", fontSize: 12, marginBottom: 2 }}>
            {safeName}
          </Text>
        )}
        <Text style={{ color: "#f4e4c1", fontSize: 14, lineHeight: 19 }}>{msg.text}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
          <Text style={{ color: "rgba(244,228,193,0.55)", fontSize: 10 }}>
            {formatTime(msg.createdAt)}
          </Text>
          {msg.pending && (
            <Text style={{ color: "rgba(244,228,193,0.55)", fontSize: 10, marginLeft: 6 }}>
              sending…
            </Text>
          )}
          {msg.failed && (
            <Text style={{ color: "#fca5a5", fontSize: 10, marginLeft: 6 }}>
              failed
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export function CrewChat({ roomId }: CrewChatProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    messages,
    addMessage,
    setMessages,
    replaceMessage,
    markMessageFailed,
    chatOpen,
    setChatOpen,
    unreadCount,
  } = useMultiplayerStore();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const badgePulse = useSharedValue(1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // Load history once on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    apiClient
      .getChat(roomId, 50)
      .then(({ messages: msgs }) => {
        if (!cancelled) setMessages(msgs);
      })
      .catch(() => {
        // Non-fatal — chat just starts empty
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, setMessages]);

  // Pulse the badge while there are unread messages
  useEffect(() => {
    if (unreadCount > 0 && !chatOpen && !reduceMotion) {
      badgePulse.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      );
    } else {
      badgePulse.value = withTiming(1, { duration: 200 });
    }
  }, [unreadCount, chatOpen, reduceMotion, badgePulse]);

  // Auto-scroll to bottom on new messages when open
  useEffect(() => {
    if (chatOpen && messages.length > 0) {
      const id = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: !reduceMotion });
      }, 50);
      return () => clearTimeout(id);
    }
  }, [messages.length, chatOpen, reduceMotion]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (text.length > MAX_LEN) {
      setError(`Max ${MAX_LEN} characters.`);
      return;
    }
    setError(null);

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessage = {
      id: tempId,
      roomId,
      userId: user?.id ?? "me",
      userName: user?.username ?? "You",
      text,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    addMessage(optimistic);
    setInput("");
    setSending(true);

    try {
      const { message } = await apiClient.sendChat(roomId, text);
      replaceMessage(tempId, message);
    } catch (e: unknown) {
      markMessageFailed(tempId);
      const msg = (e as { message?: string })?.message ?? "Failed to send.";
      setError(msg);
    } finally {
      setSending(false);
    }
  }, [input, sending, roomId, user, addMessage, replaceMessage, markMessageFailed]);

  return (
    <>
      {/* Floating toggle button */}
      {!chatOpen && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: 16,
            bottom: 24 + insets.bottom,
            zIndex: 50,
          }}
        >
          <Animated.View style={badgeStyle}>
            <TouchableOpacity
              onPress={() => setChatOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={
                unreadCount > 0
                  ? `Open crew chat, ${unreadCount} new messages`
                  : "Open crew chat"
              }
              style={{
                backgroundColor: "#f5c518",
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.4,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
                borderWidth: 2,
                borderColor: "#ffd700",
              }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 26 }}>💬</Text>
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    backgroundColor: "#e94560",
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 5,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "#1a1a2e",
                  }}
                >
                  <Text style={{ color: "white", fontSize: 10, fontWeight: "800" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Drawer panel — hosted in a Modal so the keyboard layout works reliably on Android */}
      <Modal
        visible={chatOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setChatOpen(false)}
      >
        <SafeAreaView
          edges={["bottom"]}
          style={{ flex: 1, backgroundColor: "transparent" }}
        >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Backdrop — tap to dismiss */}
          <Pressable
            onPress={() => setChatOpen(false)}
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
            accessibilityLabel="Close crew chat"
          />

          {/* Drawer */}
          <View
            style={{
              backgroundColor: "#1a1a2e",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderColor: "#f5c518",
              maxHeight: "75%",
              minHeight: 320,
              shadowColor: "#000",
              shadowOpacity: 0.5,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -4 },
              elevation: 16,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: "rgba(245,197,24,0.2)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "rgba(244,228,193,0.25)",
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  marginLeft: -18,
                }} />
                <Text style={{ fontSize: 20, marginRight: 8 }}>💬</Text>
                <Text style={{ color: "#f5c518", fontWeight: "800", fontSize: 16 }}>
                  Crew Chat
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setChatOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close crew chat"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={{ color: "#f4e4c1", fontSize: 24, fontWeight: "700" }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <View style={{ flex: 1, minHeight: 200 }}>
              {loadingHistory && messages.length === 0 ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color="#f5c518" />
                </View>
              ) : messages.length === 0 ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 24,
                  }}
                >
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🪶</Text>
                  <Text
                    style={{
                      color: "#f4e4c1",
                      fontSize: 14,
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    No messages yet
                  </Text>
                  <Text
                    style={{
                      color: "rgba(244,228,193,0.55)",
                      fontSize: 12,
                      textAlign: "center",
                      marginTop: 4,
                    }}
                  >
                    Say hi to your crew or ask a question!
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={messages}
                  keyExtractor={(m) => m.id}
                  renderItem={({ item }) => (
                    <MessageBubble msg={item} isMe={item.userId === user?.id} />
                  )}
                  contentContainerStyle={{ paddingVertical: 8 }}
                  keyboardShouldPersistTaps="handled"
                  onContentSizeChange={() =>
                    listRef.current?.scrollToEnd({ animated: !reduceMotion })
                  }
                />
              )}
            </View>

            {/* Error banner */}
            {error && (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  backgroundColor: "rgba(127,29,29,0.5)",
                }}
              >
                <Text style={{ color: "#fca5a5", fontSize: 12, textAlign: "center" }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Input row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                paddingHorizontal: 12,
                paddingTop: 10,
                paddingBottom: 10,
                borderTopWidth: 1,
                borderColor: "rgba(245,197,24,0.15)",
                gap: 8,
              }}
            >
              <TextInput
                value={input}
                onChangeText={(t) => {
                  if (t.length <= MAX_LEN) setInput(t);
                  if (error) setError(null);
                }}
                placeholder="Message your crew…"
                placeholderTextColor="rgba(244,228,193,0.4)"
                multiline
                maxLength={MAX_LEN}
                accessibilityLabel="Crew chat message input"
                style={{
                  flex: 1,
                  backgroundColor: "#16213e",
                  borderColor: "#0f3460",
                  borderWidth: 1,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: "#f4e4c1",
                  fontSize: 14,
                  maxHeight: 100,
                  minHeight: 40,
                }}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                blurOnSubmit
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={sending || input.trim().length === 0}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                style={{
                  backgroundColor:
                    sending || input.trim().length === 0 ? "rgba(245,197,24,0.4)" : "#f5c518",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#1a1a2e" />
                ) : (
                  <Text style={{ color: "#1a1a2e", fontSize: 18, fontWeight: "800" }}>➤</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
