import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getToken } from "../lib/auth";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load persisted token into memory, then decide route
    getToken().then((token) => {
      setReady(true);
      if (!token) router.replace("/login");
    });
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
