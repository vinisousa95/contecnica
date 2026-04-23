import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser, clearAuth } from "../../lib/auth";

const MENU = [
  { label: "Enviar Fotos", desc: "Registre o andamento da obra", icon: "camera-outline" as const, route: "/fotos" },
  { label: "Reembolso de Material", desc: "Leia a nota fiscal com IA", icon: "receipt-outline" as const, route: "/reembolso" },
  { label: "Execução de Tarefas", desc: "Atualize o status das tarefas", icon: "checkmark-circle-outline" as const, route: "/tarefas" },
];

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  async function handleLogout() {
    Alert.alert("Sair", "Deseja sair do aplicativo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair", style: "destructive",
        onPress: async () => {
          await clearAuth();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoC}>C</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Con<Text style={styles.accent}>técnica</Text></Text>
          {user && <Text style={styles.userName}>{user.name}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>O que deseja fazer?</Text>

      {MENU.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={styles.card}
          onPress={() => router.push(item.route as any)}
          activeOpacity={0.7}
        >
          <View style={styles.cardIcon}>
            <Ionicons name={item.icon} size={26} color="#EA580C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#1F2937", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
  },
  logoBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "#EA580C",
    alignItems: "center", justifyContent: "center",
  },
  logoC: { color: "#fff", fontSize: 20, fontWeight: "900" },
  brand: { color: "#fff", fontSize: 18, fontWeight: "800" },
  accent: { color: "#EA580C" },
  userName: { color: "#9CA3AF", fontSize: 12 },
  logoutBtn: { padding: 4 },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: "#6B7280",
    textTransform: "uppercase", letterSpacing: 1,
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12,
  },
  card: {
    backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, padding: 18, flexDirection: "row",
    alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center",
  },
  cardLabel: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cardDesc: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
});
