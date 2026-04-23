import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getToken } from "../lib/auth";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getToken().then((t) => {
      setToken(t);
      setReady(true);
    });
  }, []);

  // Navega apenas após o Stack estar montado
  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
