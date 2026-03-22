import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Audio } from "expo-av";
import Svg, { Circle, Ellipse, Path, Rect, Defs, RadialGradient, Stop, Polygon } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

interface Props {
  islandName: string;
  skillFocus: string;
  onDismiss: () => void;
  audioUrl?: string;
}

export function IngayWarning({ islandName, skillFocus, onDismiss, audioUrl }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;

    async function playAudio() {
      if (!audioUrl) return;
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
        if (!mounted) { await sound.unloadAsync(); return; }
        soundRef.current = sound;
        await sound.playAsync();
      } catch {
        // Audio unavailable — animations continue without sound
      }
    }

    playAudio();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.stopAsync().then(() => soundRef.current?.unloadAsync()).catch(() => {});
        soundRef.current = null;
      }
    };
  }, [audioUrl]);
  // Hovering float
  const floatY = useSharedValue(0);
  // Pulse glow
  const glowScale = useSharedValue(1);
  // Lightning flash
  const flashOpacity = useSharedValue(0);
  // Body sway
  const sway = useSharedValue(0);

  useEffect(() => {
    // Entrance: drop in then hover
    floatY.value = withSequence(
      withTiming(0, { duration: 0 }),
      withRepeat(
        withSequence(
          withTiming(-12, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    // Pulse glow
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Random lightning flashes
    const flash = () => {
      flashOpacity.value = withSequence(
        withTiming(0.6, { duration: 80 }),
        withTiming(0, { duration: 80 }),
        withTiming(0.4, { duration: 60 }),
        withTiming(0, { duration: 100 })
      );
    };
    flash();
    const interval = setInterval(flash, 2800);

    // Body sway
    sway.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(5, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    return () => clearInterval(interval);
  }, [flashOpacity, floatY, glowScale, sway]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { rotate: `${sway.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: 0.35,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return (
    <View className="flex-1 bg-ocean-deep items-center justify-center px-6">

      {/* Background lightning flash overlay */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "#8e44ad",
          },
          flashStyle,
        ]}
        pointerEvents="none"
      />

      {/* Glow ring */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: "#8e44ad",
            top: "18%",
          },
          glowStyle,
        ]}
      />

      {/* Ingay SVG character */}
      <Animated.View style={[floatStyle, { marginBottom: 8 }]} entering={FadeInDown.duration(600).springify()}>
        <Svg width={200} height={260} viewBox="0 0 200 260">
          <Defs>
            <RadialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
              <Stop offset="0%" stopColor="#9b59b6" />
              <Stop offset="100%" stopColor="#4a235a" />
            </RadialGradient>
          </Defs>

          {/* Storm swirl beneath (cape/shadow) */}
          <Ellipse cx="100" cy="245" rx="55" ry="14" fill="rgba(74,35,90,0.5)" />
          <Path
            d="M45 240 Q60 200 100 195 Q140 200 155 240 Q130 260 100 258 Q70 260 45 240 Z"
            fill="url(#bodyGrad)"
            stroke="#2c1340"
            strokeWidth="2"
          />

          {/* Robe / cloak */}
          <Path
            d="M55 145 Q40 180 38 230 Q70 248 100 250 Q130 248 162 230 Q160 180 145 145 Q120 170 100 168 Q80 170 55 145 Z"
            fill="#4a235a"
            stroke="#2c1340"
            strokeWidth="3"
          />
          {/* Storm pattern on robe */}
          <Path d="M70 185 Q80 178 90 185 Q85 192 75 188 Z" fill="rgba(142,68,173,0.6)" />
          <Path d="M108 200 Q118 193 128 200 Q123 207 113 203 Z" fill="rgba(142,68,173,0.6)" />
          <Path d="M65 215 Q78 208 88 215 Q83 222 70 218 Z" fill="rgba(142,68,173,0.5)" />

          {/* Lightning bolt emblems */}
          <Polygon points="95,158 103,175 98,175 106,192 94,172 100,172" fill="#f5c518" stroke="#e67e22" strokeWidth="1" />

          {/* Arms — outstretched, menacing */}
          {/* Left arm */}
          <Path
            d="M58 138 Q30 130 18 115"
            stroke="#4a235a"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M58 138 Q30 130 18 115"
            stroke="#6c3483"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left hand with claw-like fingers */}
          <Path d="M18 115 L10 108 M18 115 L14 105 M18 115 L22 106 M18 115 L26 112"
            stroke="#7d3c98" strokeWidth="4" strokeLinecap="round" />

          {/* Right arm */}
          <Path
            d="M142 138 Q170 130 182 115"
            stroke="#4a235a"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M142 138 Q170 130 182 115"
            stroke="#6c3483"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          {/* Right claws */}
          <Path d="M182 115 L190 108 M182 115 L186 105 M182 115 L178 106 M182 115 L174 112"
            stroke="#7d3c98" strokeWidth="4" strokeLinecap="round" />

          {/* Neck */}
          <Rect x="88" y="102" width="24" height="16" rx="6" fill="#5d2680" stroke="#2c1340" strokeWidth="2" />

          {/* HEAD */}
          <Ellipse cx="100" cy="82" rx="44" ry="46" fill="url(#bodyGrad)" stroke="#2c1340" strokeWidth="3.5" />

          {/* === WILD STORM HAIR === */}
          {/* Hair spikes radiating outward */}
          <Path d="M68 48 Q60 30 56 15 Q64 28 70 42" fill="#1c0a2e" stroke="#2c1340" strokeWidth="1.5" />
          <Path d="M80 38 Q76 18 78 4 Q82 20 84 36" fill="#1c0a2e" stroke="#2c1340" strokeWidth="1.5" />
          <Path d="M100 35 Q100 14 102 0 Q104 16 104 33" fill="#1c0a2e" stroke="#2c1340" strokeWidth="1.5" />
          <Path d="M120 38 Q126 18 128 5 Q124 21 120 36" fill="#1c0a2e" stroke="#2c1340" strokeWidth="1.5" />
          <Path d="M132 48 Q142 30 148 16 Q140 30 134 44" fill="#1c0a2e" stroke="#2c1340" strokeWidth="1.5" />
          <Path d="M56 62 Q38 56 26 50 Q40 58 54 66" fill="#1c0a2e" stroke="#2c1340" strokeWidth="1.5" />
          <Path d="M144 62 Q162 56 174 50 Q160 58 146 66" fill="#1c0a2e" stroke="#2c1340" strokeWidth="1.5" />
          {/* Hair base */}
          <Path
            d="M56 60 Q58 38 80 34 Q100 30 120 34 Q142 38 144 60 Q130 50 100 48 Q70 50 56 60 Z"
            fill="#1c0a2e"
            stroke="#2c1340"
            strokeWidth="2"
          />

          {/* === MENACING FACE === */}
          {/* Glowing eyes */}
          {/* Eye sockets */}
          <Ellipse cx="82" cy="80" rx="13" ry="12" fill="#1c0a2e" />
          <Ellipse cx="118" cy="80" rx="13" ry="12" fill="#1c0a2e" />
          {/* Glowing irises */}
          <Circle cx="82" cy="80" r="9" fill="#8e44ad" />
          <Circle cx="118" cy="80" r="9" fill="#8e44ad" />
          {/* Pupils */}
          <Ellipse cx="82" cy="80" rx="4" ry="7" fill="#1c0a2e" />
          <Ellipse cx="118" cy="80" rx="4" ry="7" fill="#1c0a2e" />
          {/* Eye glow rings */}
          <Circle cx="82" cy="80" r="11" fill="none" stroke="#f5c518" strokeWidth="1.5" opacity={0.5} />
          <Circle cx="118" cy="80" r="11" fill="none" stroke="#f5c518" strokeWidth="1.5" opacity={0.5} />
          {/* Shine */}
          <Circle cx="78" cy="76" r="2" fill="rgba(255,255,255,0.4)" />
          <Circle cx="114" cy="76" r="2" fill="rgba(255,255,255,0.4)" />

          {/* Angry furrowed brows */}
          <Path d="M68 65 Q78 58 92 66" stroke="#1c0a2e" strokeWidth="5" strokeLinecap="round" fill="none" />
          <Path d="M108 66 Q122 58 132 65" stroke="#1c0a2e" strokeWidth="5" strokeLinecap="round" fill="none" />

          {/* Nose — sharp, angular */}
          <Path d="M96 88 L100 96 L104 88" stroke="#2c1340" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Mouth — jagged sneer */}
          <Path
            d="M76 106 Q82 102 88 106 L100 100 L112 106 Q118 102 124 106"
            stroke="#1c0a2e"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Fangs */}
          <Path d="M90 100 L92 108" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <Path d="M108 100 L106 108" stroke="white" strokeWidth="3" strokeLinecap="round" />

          {/* Cheek storm markings */}
          <Path d="M62 88 Q65 84 68 88" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.7} />
          <Path d="M132 88 Q135 84 138 88" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.7} />

          {/* Floating lightning bolts near hands */}
          <Polygon points="12,95 16,105 14,105 18,115 10,103 13,103" fill="#f5c518" opacity={0.9} />
          <Polygon points="188,95 184,105 186,105 182,115 190,103 187,103" fill="#f5c518" opacity={0.9} />

        </Svg>
      </Animated.View>

      {/* Text content */}
      <Animated.View entering={FadeIn.delay(400).duration(500)} className="items-center px-4">
        <Text className="text-coral text-3xl font-bold text-center mb-1">
          Ingay appears...
        </Text>
        <Text className="text-parchment text-base text-center mb-1 font-bold">
          {islandName}
        </Text>
        <Text className="text-gold text-sm text-center mb-4">
          {skillFocus}
        </Text>
        <Text className="text-parchment/70 text-sm text-center leading-6 mb-8 italic">
          "You think you can hear through the storm? Noise is my domain, little sailor. Good luck."
        </Text>

        <TouchableOpacity
          onPress={onDismiss}
          className="bg-coral rounded-xl px-10 py-4"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-base">I am not afraid ⚓</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
