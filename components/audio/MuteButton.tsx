import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useAudioStore } from "@/stores/audio";

export function MuteButton() {
  const { isMuted, toggleMute } = useAudioStore();

  return (
    <TouchableOpacity onPress={toggleMute} style={styles.fab} activeOpacity={0.75}>
      <Text style={styles.icon}>{isMuted ? "🔇" : "🔊"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(10, 14, 26, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(245, 197, 24, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  icon: {
    fontSize: 18,
  },
});
