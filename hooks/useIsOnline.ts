import { useNetInfo } from "@react-native-community/netinfo";

export function useIsOnline(): boolean {
  const { isConnected } = useNetInfo();
  return isConnected === true;
}
