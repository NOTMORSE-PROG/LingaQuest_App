import { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { ShipHealth, ShipPart } from "@/types";

const PARTS: { key: ShipPart; label: string; emoji: string }[] = [
  { key: "hull", label: "Hull", emoji: "🚢" },
  { key: "mast", label: "Mast", emoji: "🪵" },
  { key: "sails", label: "Sails", emoji: "⛵" },
  { key: "anchor", label: "Anchor", emoji: "⚓" },
  { key: "rudder", label: "Rudder", emoji: "🔱" },
];

function healthColor(hp: number): string {
  if (hp <= 0) return "bg-red-700";
  if (hp <= 25) return "bg-red-500";
  if (hp < 50) return "bg-coral";
  if (hp < 100) return "bg-yellow-500";
  return "bg-green-500";
}

function statusLabel(hp: number): { text: string; color: string } {
  if (hp <= 0) return { text: "SUNK ✗", color: "text-red-400" };
  if (hp <= 25) return { text: "⚠ DANGER", color: "text-red-400" };
  if (hp >= 100) return { text: "INTACT ✓", color: "text-green-400" };
  return { text: `${hp}%`, color: "text-parchment" };
}

interface ShipHealthDisplayProps {
  health: ShipHealth;
  highlightPart?: ShipPart;
  dangerParts?: ShipPart[];
}

function DangerPulse({ isDanger, children }: { isDanger: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isDanger) {
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      opacity.setValue(1);
    }
    return () => { animRef.current?.stop(); };
  }, [isDanger, opacity]);

  if (!isDanger) return <>{children}</>;
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export function ShipHealthDisplay({ health, highlightPart, dangerParts = [] }: ShipHealthDisplayProps) {
  return (
    <View className="bg-ocean-mid rounded-2xl p-4 border border-ocean-light">
      <Text className="text-gold font-bold text-sm mb-3">SHIP HEALTH</Text>
      <View className="space-y-2">
        {PARTS.map(({ key, label, emoji }) => {
          const hp = health[key];
          const isDanger = dangerParts.includes(key);
          const isHighlight = highlightPart === key;
          const status = statusLabel(hp);

          return (
            <DangerPulse key={key} isDanger={isDanger}>
              <View
                className={`${isHighlight ? "bg-ocean-light/30 rounded-lg px-2 py-1 -mx-2 border border-gold/30" : ""}`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center">
                    <Text className="text-base mr-2">{emoji}</Text>
                    <Text
                      className={`text-xs font-semibold ${
                        isHighlight ? "text-gold" : isDanger ? "text-red-400" : "text-parchment"
                      }`}
                    >
                      {label}
                    </Text>
                    {isHighlight && (
                      <Text className="text-gold text-xs ml-1">(repairing)</Text>
                    )}
                  </View>
                  <Text className={`text-xs font-bold ${status.color}`}>
                    {status.text}
                  </Text>
                </View>
                <View className={`h-2 rounded-full overflow-hidden ${isDanger ? "bg-red-900/50" : "bg-ocean-deep"}`}>
                  <View
                    className={`h-full rounded-full ${healthColor(hp)}`}
                    style={{ width: `${Math.max(0, hp)}%` }}
                  />
                </View>
              </View>
            </DangerPulse>
          );
        })}
      </View>
    </View>
  );
}
