/**
 * DagatCharacter — Rive-animated player character.
 *
 * State machine inputs (defined in the .riv file):
 *   - "isIdle" (boolean) — idle loop
 *   - "isTalking" (boolean) — talking/listening animation
 *   - "isCorrect" (trigger) — correct answer celebration
 *   - "isWrong" (trigger) — wrong answer reaction
 *   - "isCelebrating" (trigger) — badge/island complete
 *
 * The .riv file should be placed at assets/animations/dagat.riv
 * Create this file in the Rive editor at https://rive.app
 */
import { useEffect, useRef } from "react";
import Rive, { RiveRef } from "rive-react-native";
import { View } from "react-native";

export type DagatState = "idle" | "talking" | "correct" | "wrong" | "celebrating";

interface DagatCharacterProps {
  state: DagatState;
  width?: number;
  height?: number;
}

export function DagatCharacter({
  state,
  width = 200,
  height = 200,
}: DagatCharacterProps) {
  const riveRef = useRef<RiveRef>(null);

  useEffect(() => {
    // Reset all boolean inputs first
    riveRef.current?.setInputState("DagatStateMachine", "isIdle", false);
    riveRef.current?.setInputState("DagatStateMachine", "isTalking", false);

    switch (state) {
      case "idle":
        riveRef.current?.setInputState("DagatStateMachine", "isIdle", true);
        break;
      case "talking":
        riveRef.current?.setInputState("DagatStateMachine", "isTalking", true);
        break;
      case "correct":
        riveRef.current?.fireState("DagatStateMachine", "isCorrect");
        break;
      case "wrong":
        riveRef.current?.fireState("DagatStateMachine", "isWrong");
        break;
      case "celebrating":
        riveRef.current?.fireState("DagatStateMachine", "isCelebrating");
        break;
    }
  }, [state]);

  return (
    <View style={{ width, height }}>
      <Rive
        ref={riveRef}
        resourceName="dagat"
        stateMachineName="DagatStateMachine"
        style={{ width, height }}
      />
    </View>
  );
}
