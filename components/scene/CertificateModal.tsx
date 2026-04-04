import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CERT_WIDTH = SCREEN_WIDTH - 32; // 16px padding each side
const CERT_ASPECT = 778 / 1010; // height / width of the certificate image
const CERT_HEIGHT = CERT_WIDTH * CERT_ASPECT;

interface Props {
  username: string;
  onClose: () => void;
}

export function CertificateModal({ username, onClose }: Props) {
  const bgOpacity = useSharedValue(0);
  const certScale = useSharedValue(0.7);
  const certOpacity = useSharedValue(0);
  const btnOpacity = useSharedValue(0);
  const btnScale = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    certOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    certScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    btnOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));
    btnScale.value = withDelay(800, withSpring(1, { damping: 12, stiffness: 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const certStyle = useAnimatedStyle(() => ({
    transform: [{ scale: certScale.value }],
    opacity: certOpacity.value,
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
    opacity: btnOpacity.value,
  }));

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 20 }]} pointerEvents="box-none">
      {/* Dark overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.92)" }, bgStyle]}
      />

      {/* Content */}
      <View style={[StyleSheet.absoluteFillObject, styles.center, { paddingHorizontal: 16 }]} pointerEvents="box-none">
        {/* Certificate image with username overlay */}
        <Animated.View style={[{ width: CERT_WIDTH, height: CERT_HEIGHT }, certStyle]}>
          <Image
            source={require("@/assets/images/certificate.png")}
            style={{ width: CERT_WIDTH, height: CERT_HEIGHT, borderRadius: 8 }}
            resizeMode="contain"
          />
          {/* Username positioned on the underline — approximately 37% from top */}
          <View style={styles.usernameContainer}>
            <Text style={styles.usernameText} numberOfLines={1} adjustsFontSizeToFit>
              {username}
            </Text>
          </View>
        </Animated.View>

        {/* Continue button */}
        <Animated.View style={[{ marginTop: 28, width: "100%" }, btnStyle]}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  usernameContainer: {
    position: "absolute",
    // Position on the underline area of the certificate (~37% from top)
    top: "37%",
    left: "20%",
    right: "20%",
    alignItems: "center",
    justifyContent: "center",
  },
  usernameText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    fontStyle: "italic",
  },
  button: {
    backgroundColor: "#f5c518",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
