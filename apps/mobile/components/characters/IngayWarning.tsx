/**
 * IngayWarning — Dramatic warning screen shown at start of each island.
 *
 * Ingay is the storm-sorcerer antagonist. Uses Rive for dramatic entrance
 * animation, or falls back to Lottie if a .lottie file is provided instead.
 *
 * The .riv file: assets/animations/ingay.riv
 * State machine: single "entrance" trigger, plays once then holds.
 */
import { useEffect, useRef } from "react";
import Rive, { RiveRef } from "rive-react-native";
import { View, Text, TouchableOpacity } from "react-native";

interface IngayWarningProps {
  islandName: string;
  skillFocus: string;
  onDismiss: () => void;
}

export function IngayWarning({ islandName, skillFocus, onDismiss }: IngayWarningProps) {
  const riveRef = useRef<RiveRef>(null);

  useEffect(() => {
    // Trigger dramatic entrance
    riveRef.current?.fireState("IngayStateMachine", "entrance");
  }, []);

  return (
    <View className="flex-1 bg-ocean-deep items-center justify-center px-8">
      {/* Ingay Rive animation */}
      <View className="w-48 h-48 mb-6">
        <Rive
          ref={riveRef}
          resourceName="ingay"
          stateMachineName="IngayStateMachine"
          style={{ width: 192, height: 192 }}
        />
      </View>

      <Text className="text-coral text-2xl font-bold text-center mb-2">
        Ingay warns you...
      </Text>
      <Text className="text-parchment text-base text-center mb-1">
        {islandName}
      </Text>
      <Text className="text-parchment-dark text-sm text-center mb-10">
        Skill: {skillFocus}
      </Text>
      <Text className="text-parchment/70 text-sm text-center leading-6 mb-10">
        "You think you can hear through the noise? The storm awaits you, little sailor."
      </Text>

      <TouchableOpacity
        onPress={onDismiss}
        className="bg-coral rounded-xl px-10 py-4"
      >
        <Text className="text-white font-bold text-base">I am not afraid</Text>
      </TouchableOpacity>
    </View>
  );
}
