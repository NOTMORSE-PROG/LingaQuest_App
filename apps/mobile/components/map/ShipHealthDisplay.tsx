import { View, Text } from "react-native";
import { ShipHealth, ShipPart } from "@linguaquest/shared";

const PARTS: { key: ShipPart; label: string; emoji: string }[] = [
  { key: "hull", label: "Hull", emoji: "🚢" },
  { key: "mast", label: "Mast", emoji: "🪵" },
  { key: "sails", label: "Sails", emoji: "⛵" },
  { key: "anchor", label: "Anchor", emoji: "⚓" },
  { key: "rudder", label: "Rudder", emoji: "🔱" },
];

function healthColor(hp: number): string {
  if (hp <= 0) return "bg-red-700";
  if (hp < 50) return "bg-coral";
  if (hp < 100) return "bg-yellow-500";
  return "bg-green-500";
}

interface ShipHealthDisplayProps {
  health: ShipHealth;
  highlightPart?: ShipPart;
}

export function ShipHealthDisplay({ health, highlightPart }: ShipHealthDisplayProps) {
  return (
    <View className="bg-ocean-mid rounded-2xl p-4 border border-ocean-light">
      <Text className="text-gold font-bold text-sm mb-3">SHIP HEALTH</Text>
      <View className="space-y-2">
        {PARTS.map(({ key, label, emoji }) => {
          const hp = health[key];
          return (
            <View key={key}>
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center">
                  <Text className="text-base mr-2">{emoji}</Text>
                  <Text
                    className={`text-xs font-semibold ${
                      highlightPart === key ? "text-gold" : "text-parchment"
                    }`}
                  >
                    {label}
                  </Text>
                  {highlightPart === key && (
                    <Text className="text-gold text-xs ml-1">(repairing)</Text>
                  )}
                </View>
                <Text
                  className={`text-xs font-bold ${hp <= 0 ? "text-red-400" : "text-parchment"}`}
                >
                  {hp}%
                </Text>
              </View>
              <View className="h-2 bg-ocean-deep rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${healthColor(hp)}`}
                  style={{ width: `${Math.max(0, hp)}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
