import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  type TextInput as TextInputType,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin, statusCodes } from "@/lib/google-signin";
import { useAuthStore } from "@/stores/auth";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const queryClient = useQueryClient();

  // All hooks must be declared before any early returns — Rules of Hooks
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [editUsername, setEditUsername] = useState(user?.username ?? "");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [checkUsernameError, setCheckUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkError, setLinkError] = useState("");
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newPasswordRef = useRef<TextInputType>(null);
  const confirmPasswordRef = useRef<TextInputType>(null);

  useEffect(() => {
    return () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
      if (usernameSuccessTimer.current) clearTimeout(usernameSuccessTimer.current);
      if (passwordSuccessTimer.current) clearTimeout(passwordSuccessTimer.current);
    };
  }, []);

  if (!user) return null;

  const isGoogleOnly = !!user.googleId && !user.hasPassword;
  const isLinked = !!user.googleId && !!user.hasPassword;
  const isEmailOnly = !user.googleId;

  function onEditUsernameChange(val: string) {
    setEditUsername(val);
    setUsernameAvailable(null);
    setUsernameError("");
    setCheckUsernameError("");
    setUsernameSuccess(false);
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (val.trim().length < 3) return;
    usernameTimer.current = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const result = await apiClient.checkUsername(val.trim());
        setUsernameAvailable(result.available || val.trim() === user?.username);
      } catch {
        setUsernameAvailable(null);
        setCheckUsernameError("Could not verify name. Check your connection.");
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  }

  async function handleSaveUsername() {
    const trimmed = editUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      setUsernameError("3–20 chars, letters/numbers/underscores only.");
      return;
    }
    if (usernameAvailable === false) {
      setUsernameError("That name is taken. Try another.");
      return;
    }
    if (trimmed === user?.username) {
      setUsernameError("That's already your current name.");
      return;
    }
    setSavingUsername(true);
    setUsernameError("");
    try {
      const updated = await apiClient.updateUsername(trimmed);
      await updateUser({ username: updated.username });
      setUsernameSuccess(true);
      if (usernameSuccessTimer.current) clearTimeout(usernameSuccessTimer.current);
      usernameSuccessTimer.current = setTimeout(() => setUsernameSuccess(false), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined;
      setUsernameError(msg ?? "Could not save username.");
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      if (passwordSuccessTimer.current) clearTimeout(passwordSuccessTimer.current);
      passwordSuccessTimer.current = setTimeout(() => setPasswordSuccess(false), 3000);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined;
      setPasswordError(msg ?? "Could not update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLinkGoogle() {
    setLinkError("");
    setLinkingGoogle(true);
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error("Google sign-in failed. Please try again.");

      const updated = await apiClient.linkGoogle(idToken);
      await updateUser({ googleId: updated.googleId });
      setLinkError("");
      Alert.alert("Connected", "Your Google account has been linked.");
    } catch (e: unknown) {
      const code = (e as any)?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) return;
      if (code === statusCodes.IN_PROGRESS) return;
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setLinkError("Google Play Services is required. Please update it and try again.");
        return;
      }
      const msg = e instanceof Error ? e.message : undefined;
      setLinkError(msg ?? "Could not link Google account.");
    } finally {
      setLinkingGoogle(false);
    }
  }

  async function handleLogout() {
    await logout();
    queryClient.clear();
    // Navigation is handled by MainLayout's useEffect watching token/user
  }

  return (
    <SafeAreaView className="flex-1 bg-ocean-deep" edges={["top"]}>
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
      {/* Header */}
      <View className="flex-row items-center mb-8 mt-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-1">
          <Text className="text-parchment text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-gold text-2xl font-bold">Profile</Text>
      </View>

      {/* Section 1 — Sailor Identity */}
      <View className="bg-ocean-mid rounded-2xl p-5 mb-5">
        <Text className="text-parchment-dark text-xs uppercase tracking-widest mb-3">
          Sailor Identity
        </Text>
        <Text className="text-parchment-dark text-sm mb-4">{user?.email}</Text>

        <Text className="text-parchment text-xs mb-2">Sailor Name</Text>
        <View className="relative mb-2">
          <TextInput
            className="bg-ocean-deep border border-ocean-light rounded-xl px-4 py-3 text-parchment text-base pr-10"
            placeholder="Sailor name"
            placeholderTextColor="#6b7280"
            value={editUsername}
            onChangeText={onEditUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          {checkingUsername && (
            <ActivityIndicator
              color="#f5c518"
              size="small"
              style={{ position: "absolute", right: 14, top: 14 }}
            />
          )}
          {!checkingUsername && usernameAvailable === true && (
            <Text style={{ position: "absolute", right: 14, top: 12, fontSize: 18, color: "#22c55e" }}>✓</Text>
          )}
          {!checkingUsername && usernameAvailable === false && (
            <Text style={{ position: "absolute", right: 14, top: 12, fontSize: 18, color: "#ef4444" }}>✗</Text>
          )}
        </View>

        {usernameError ? (
          <Text className="text-coral text-xs mb-2">{usernameError}</Text>
        ) : null}
        {!usernameError && checkUsernameError ? (
          <Text className="text-parchment-dark text-xs mb-2">{checkUsernameError}</Text>
        ) : null}
        {usernameSuccess ? (
          <Text className="text-green-400 text-xs mb-2">Name updated!</Text>
        ) : null}

        {(() => {
          const noChanges = editUsername.trim() === (user?.username ?? "");
          const isDisabled = savingUsername || checkingUsername || usernameAvailable === false || noChanges;
          return (
            <TouchableOpacity
              onPress={handleSaveUsername}
              disabled={isDisabled}
              className={`rounded-xl py-3 items-center ${isDisabled ? "bg-ocean-light opacity-40" : "border border-gold"}`}
            >
              {savingUsername ? (
                <ActivityIndicator color="#f5c518" />
              ) : (
                <Text className={`text-sm font-semibold ${isDisabled ? "text-parchment-dark" : "text-parchment"}`}>
                  Save Name
                </Text>
              )}
            </TouchableOpacity>
          );
        })()}
      </View>

      {/* Section 2 — Password (email/password users only) */}
      {!isGoogleOnly && (
        <View className="bg-ocean-mid rounded-2xl p-5 mb-5">
          <Text className="text-parchment-dark text-xs uppercase tracking-widest mb-4">
            Change Password
          </Text>

          <TextInput
            className="bg-ocean-deep border border-ocean-light rounded-xl px-4 py-3 text-parchment text-base mb-3"
            placeholder="Current password"
            placeholderTextColor="#6b7280"
            value={currentPassword}
            onChangeText={(v) => { setCurrentPassword(v); setPasswordError(""); }}
            secureTextEntry
            returnKeyType="next"
            onSubmitEditing={() => newPasswordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TextInput
            ref={newPasswordRef}
            className="bg-ocean-deep border border-ocean-light rounded-xl px-4 py-3 text-parchment text-base mb-3"
            placeholder="New password (min 8 chars)"
            placeholderTextColor="#6b7280"
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); setPasswordError(""); }}
            secureTextEntry
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TextInput
            ref={confirmPasswordRef}
            className="bg-ocean-deep border border-ocean-light rounded-xl px-4 py-3 text-parchment text-base mb-4"
            placeholder="Confirm new password"
            placeholderTextColor="#6b7280"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setPasswordError(""); }}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleChangePassword}
          />

          {passwordError ? (
            <Text className="text-coral text-sm mb-3">{passwordError}</Text>
          ) : null}
          {passwordSuccess ? (
            <Text className="text-green-400 text-sm mb-3">Password updated successfully.</Text>
          ) : null}

          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={savingPassword}
            className="bg-gold rounded-xl py-3 items-center"
          >
            {savingPassword ? (
              <ActivityIndicator color="#1a1a2e" />
            ) : (
              <Text className="text-ocean-deep font-bold">Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Section 3 — Google Account */}
      <View className="bg-ocean-mid rounded-2xl p-5 mb-5">
        <Text className="text-parchment-dark text-xs uppercase tracking-widest mb-4">
          Google Account
        </Text>

        {isGoogleOnly && (
          <Text className="text-parchment text-sm">Signed in with Google ✓</Text>
        )}

        {(isLinked) && (
          <Text className="text-parchment text-sm">Google account connected ✓</Text>
        )}

        {isEmailOnly && (
          <>
            {linkError ? (
              <Text className="text-coral text-sm mb-3">{linkError}</Text>
            ) : null}
            <TouchableOpacity
              onPress={handleLinkGoogle}
              disabled={linkingGoogle}
              className="border border-gold rounded-xl py-3 items-center flex-row justify-center"
            >
              {linkingGoogle ? (
                <ActivityIndicator color="#f5c518" />
              ) : (
                <>
                  <Text className="text-parchment text-sm mr-2">G</Text>
                  <Text className="text-parchment font-semibold text-sm">
                    Connect Google Account
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text className="text-parchment-dark text-xs mt-2 text-center">
              Your Google account email must match {user?.email}
            </Text>
          </>
        )}
      </View>

      {/* Section 4 — Danger Zone */}
      <View className="bg-ocean-mid rounded-2xl p-5 mb-8">
        <Text className="text-parchment-dark text-xs uppercase tracking-widest mb-4">
          Account
        </Text>
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-coral rounded-xl py-4 items-center"
        >
          <Text className="text-white font-bold text-base">Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
