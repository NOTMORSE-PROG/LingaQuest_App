import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import ViewShot from "react-native-view-shot";
import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Badge } from "@/types";
import { CERTIFICATE_FILE } from "@/components/scene/CertificateModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CERT_WIDTH = SCREEN_WIDTH - 80;
const CERT_ASPECT = 778 / 1010;
const CERT_HEIGHT = CERT_WIDTH * CERT_ASPECT;

interface Props {
  username: string;
}

export function CertificateSection({ username }: Props) {
  const { user } = useAuthStore();
  const [fileExists, setFileExists] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const { data: badges } = useQuery({
    queryKey: ["badges", user?.id],
    queryFn: () => apiClient.getBadges(),
    enabled: !!user,
  });

  const hasCaptainBadge = badges?.some((b: Badge) => b.badgeType === "the_captain") ?? false;

  useEffect(() => {
    setFileExists(CERTIFICATE_FILE.exists);
  }, []);

  const handleGenerate = useCallback(() => {
    setShowGenerator(true);
    setGenerating(true);
  }, []);

  // Capture the hidden ViewShot once it's rendered
  useEffect(() => {
    if (!showGenerator || !generating) return;
    const timer = setTimeout(async () => {
      try {
        const uri = await viewShotRef.current?.capture?.();
        if (uri) {
          const captured = new File(uri);
          captured.copy(CERTIFICATE_FILE);
          setFileExists(true);
        }
      } catch {
        // Silent fail
      } finally {
        setGenerating(false);
        setShowGenerator(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [showGenerator, generating]);

  const handleShare = useCallback(async () => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) return;
      await Sharing.shareAsync(CERTIFICATE_FILE.uri, { mimeType: "image/png" });
    } catch {
      // Silent fail
    }
  }, []);

  // Not earned yet
  if (!hasCaptainBadge) {
    return (
      <View className="bg-ocean-mid rounded-2xl p-5 mb-5">
        <Text className="text-parchment-dark text-xs uppercase tracking-widest mb-3">
          Certificate of Completion
        </Text>
        <Text className="text-parchment-dark text-sm text-center py-4">
          Complete all 7 islands to earn your certificate.
        </Text>
      </View>
    );
  }

  // Badge earned but no local file — offer to generate
  if (!fileExists) {
    return (
      <View className="bg-ocean-mid rounded-2xl p-5 mb-5">
        <Text className="text-parchment-dark text-xs uppercase tracking-widest mb-3">
          Certificate of Completion
        </Text>
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={generating}
          className="bg-gold rounded-xl py-3 items-center"
        >
          {generating ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text className="text-ocean-deep font-bold">Generate Certificate</Text>
          )}
        </TouchableOpacity>

        {/* Hidden ViewShot for generation */}
        {showGenerator && (
          <View style={{ position: "absolute", left: -9999, top: 0 }}>
            <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
              <View style={{ width: CERT_WIDTH, height: CERT_HEIGHT }}>
                <Image
                  source={require("@/assets/images/certificate.png")}
                  style={{ width: CERT_WIDTH, height: CERT_HEIGHT, borderRadius: 8 }}
                  resizeMode="contain"
                />
                <View
                  style={{
                    position: "absolute",
                    top: "37%",
                    left: "20%",
                    right: "20%",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "800",
                      color: "#1a1a1a",
                      textAlign: "center",
                      fontStyle: "italic",
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {username}
                  </Text>
                </View>
              </View>
            </ViewShot>
          </View>
        )}
      </View>
    );
  }

  // Certificate exists — show preview + share button
  return (
    <View className="bg-ocean-mid rounded-2xl p-5 mb-5">
      <Text className="text-parchment-dark text-xs uppercase tracking-widest mb-3">
        Certificate of Completion
      </Text>
      <View className="items-center mb-4">
        <Image
          source={{ uri: CERTIFICATE_FILE.uri }}
          style={{
            width: CERT_WIDTH,
            height: CERT_HEIGHT,
            borderRadius: 8,
          }}
          resizeMode="contain"
        />
      </View>
      <TouchableOpacity
        onPress={handleShare}
        className="bg-gold rounded-xl py-3 items-center"
      >
        <Text className="text-ocean-deep font-bold">Share Certificate</Text>
      </TouchableOpacity>
    </View>
  );
}
