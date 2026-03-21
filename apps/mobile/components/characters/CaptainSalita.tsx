/**
 * CaptainSalita — Rive-animated mentor character.
 *
 * State machine inputs (defined in the .riv file):
 *   - "isIdle" (boolean) — idle loop, subtle breathing
 *   - "isTalking" (boolean) — mouth moves, text bubble appears
 *   - "isPointing" (trigger) — points toward map/quest
 *
 * The .riv file: assets/animations/captain_salita.riv
 *
 * In Character Mode, she appears as the quest giver delivering
 * prompts via animated text bubbles.
 */
import { useEffect, useRef } from "react";
import Rive, { RiveRef } from "rive-react-native";
import { View, Text } from "react-native";

export type CaptainState = "idle" | "talking" | "pointing";

interface CaptainSalitaProps {
  state: CaptainState;
  dialogue?: string;
  width?: number;
  height?: number;
}

export function CaptainSalita({
  state,
  dialogue,
  width = 180,
  height = 220,
}: CaptainSalitaProps) {
  const riveRef = useRef<RiveRef>(null);

  useEffect(() => {
    riveRef.current?.setInputState("CaptainStateMachine", "isIdle", false);
    riveRef.current?.setInputState("CaptainStateMachine", "isTalking", false);

    switch (state) {
      case "idle":
        riveRef.current?.setInputState("CaptainStateMachine", "isIdle", true);
        break;
      case "talking":
        riveRef.current?.setInputState("CaptainStateMachine", "isTalking", true);
        break;
      case "pointing":
        riveRef.current?.fireState("CaptainStateMachine", "isPointing");
        break;
    }
  }, [state]);

  return (
    <View className="items-center">
      <View style={{ width, height }}>
        <Rive
          ref={riveRef}
          resourceName="captain_salita"
          stateMachineName="CaptainStateMachine"
          style={{ width, height }}
        />
      </View>

      {/* Animated text bubble (character mode) */}
      {dialogue && state === "talking" && (
        <View className="bg-parchment rounded-2xl rounded-tl-none px-4 py-3 max-w-xs mt-1 border border-parchment-dark">
          <Text className="text-ocean-deep text-sm leading-6 italic">"{dialogue}"</Text>
        </View>
      )}
    </View>
  );
}
