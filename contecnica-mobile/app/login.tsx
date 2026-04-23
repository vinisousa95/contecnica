import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { router } from "expo-router";
import { authApi } from "../lib/api";
import { saveToken, saveUser } from "../lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.login(email.trim(), password);
      if (!result.token) throw new Error("Token não recebido do servidor");
      await saveToken(result.token);
      await saveUser(result.user);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoBox}>
          <Text style={styles.logoC}>C</Text>
        </View>
        <Text style={styles.brand}>
          Con<Text style={styles.brandAccent}>técnica</Text>
        </Text>
        <Text style={styles.sub}>Área do Responsável de Obra</Text>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1F2937" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logoBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: "#EA580C", alignSelf: "center",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  logoC: { color: "#fff", fontSize: 32, fontWeight: "900" },
  brand: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center" },
  brandAccent: { color: "#EA580C" },
  sub: { color: "#9CA3AF", fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 36 },
  form: { gap: 8 },
  label: { color: "#D1D5DB", fontSize: 13, fontWeight: "600", marginBottom: 2 },
  input: {
    backgroundColor: "#374151", borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 13, color: "#fff", fontSize: 15, marginBottom: 12,
    borderWidth: 1, borderColor: "#4B5563",
  },
  btn: {
    backgroundColor: "#EA580C", borderRadius: 10, paddingVertical: 14,
    alignItems: "center", marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
