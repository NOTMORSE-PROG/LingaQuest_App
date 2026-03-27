// Safe wrapper — falls back to no-op when native module is unavailable (Expo Go)
let _GoogleSignin: any;
let _statusCodes: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@react-native-google-signin/google-signin");
  _GoogleSignin = mod.GoogleSignin;
  _statusCodes = mod.statusCodes;
} catch {
  _GoogleSignin = {
    configure: () => {},
    hasPlayServices: async () => true,
    signIn: async () => {
      throw Object.assign(
        new Error("Google Sign-in requires a development build, not Expo Go."),
        { code: "NOT_AVAILABLE" }
      );
    },
  };
  _statusCodes = {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    DEVELOPER_ERROR: "DEVELOPER_ERROR",
    SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
  };
}

export const GoogleSignin = _GoogleSignin;
export const statusCodes = _statusCodes;
