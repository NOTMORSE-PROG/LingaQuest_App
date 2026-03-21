import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/auth";

export default function Index() {
  const { token } = useAuthStore();
  return <Redirect href={token ? "/(main)/dashboard" : "/(auth)/login"} />;
}
