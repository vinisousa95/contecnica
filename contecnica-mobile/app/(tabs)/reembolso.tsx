import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { projectsApi, expensesApi } from "../../lib/api";
import { scanReceipt, type ReceiptData } from "../../lib/scanReceipt";

type Step = "project" | "photo" | "review";

export default function ReembolsoScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [step, setStep] = useState<Step>("project");
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    projectsApi.list()
      .then((data: any) => setProjects(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => setProjects([]));

    expensesApi.categories()
      .then((cats: any) => {
        const list = Array.isArray(cats) ? cats : [];
        const mat = list.find((c: any) => c.name?.toLowerCase().includes("material"));
        if (mat) setCategoryId(mat.id);
      })
      .catch(() => {});
  }, []);

  async function pickAndScan(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permissão necessária", "Permita o acesso à câmera/galeria.");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setImage(uri);
    setStep("photo");
    setScanning(true);
    try {
      const data = await scanReceipt(uri);
      setReceipt(data);
      setStep("review");
    } catch {
      setReceipt({ supplier: "", totalAmount: 0, items: "", date: null });
      setStep("review");
      Alert.alert("IA indisponível", "Preencha os dados manualmente.");
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit() {
    if (!receipt || !projectId) return;
    if (!receipt.totalAmount || receipt.totalAmount <= 0) {
      Alert.alert("Atenção", "Informe o valor total.");
      return;
    }
    setSending(true);
    try {
      await expensesApi.create({
        projectId,
        categoryId: categoryId || undefined,
        description: `Reembolso: ${receipt.supplier || "Material"}`,
        notes: receipt.items || undefined,
        amount: receipt.totalAmount,
        dueDate: new Date().toISOString(),
        status: "PENDING",
      });
      Alert.alert("✓ Reembolso enviado!", "Despesa registrada com sucesso.", [
        { text: "OK", onPress: () => { setStep("project"); setProjectId(""); setImage(null); setReceipt(null); } },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSending(false);
    }
  }

  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Reembolso de Material</Text>

      <SectionCard title="1. Selecionar Obra" done={!!projectId} onReset={projectId ? () => { setStep("project"); setProjectId(""); setImage(null); setReceipt(null); } : undefined}>
        {step === "project" ? (
          projects.length === 0
            ? <ActivityIndicator color="#EA580C" style={{ padding: 20 }} />
            : projects.map(p => (
              <TouchableOpacity key={p.id} style={styles.listItem} onPress={() => { setProjectId(p.id); setStep("photo"); }} activeOpacity={0.7}>
                <Ionicons name="business-outline" size={16} color="#EA580C" />
                <Text style={styles.listItemText}>{p.name}</Text>
                <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
              </TouchableOpacity>
            ))
        ) : (
          <View style={styles.selectedRow}>
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text style={styles.selectedText}>{selectedProject?.name}</Text>
          </View>
        )}
      </SectionCard>

      {(step === "photo" || step === "review") && (
        <SectionCard title="2. Foto da Nota Fiscal" done={step === "review"} onReset={step === "review" ? () => { setStep("photo"); setReceipt(null); setImage(null); } : undefined}>
          {step === "photo" && (
            <>
              <Text style={styles.hint}>Tire uma foto clara da nota fiscal. A IA irá ler os dados automaticamente.</Text>
              {scanning ? (
                <View style={styles.scanningBox}>
                  <ActivityIndicator color="#EA580C" size="large" />
                  <Text style={styles.scanningText}>IA lendo a nota fiscal...</Text>
                </View>
              ) : (
                <View style={styles.photoBtns}>
                  <TouchableOpacity style={styles.photoBtn} onPress={() => pickAndScan(true)} activeOpacity={0.7}>
                    <Ionicons name="camera-outline" size={22} color="#fff" />
                    <Text style={styles.photoBtnText}>Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.photoBtn, { backgroundColor: "#374151" }]} onPress={() => pickAndScan(false)} activeOpacity={0.7}>
                    <Ionicons name="images-outline" size={22} color="#fff" />
                    <Text style={styles.photoBtnText}>Galeria</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
          {step === "review" && image && (
            <Image source={{ uri: image }} style={styles.thumbImg} resizeMode="cover" />
          )}
        </SectionCard>
      )}

      {step === "review" && receipt && (
        <SectionCard title="3. Confirmar Dados" done={false}>
          <View style={styles.aiTag}>
            <Ionicons name="sparkles-outline" size={14} color="#7C3AED" />
            <Text style={styles.aiTagText}>Preenchido pela IA — revise antes de enviar</Text>
          </View>

          <Field label="Fornecedor" value={receipt.supplier} onChange={(v: string) => setReceipt(r => r ? { ...r, supplier: v } : r)} />
          <Field
            label="Valor Total (R$)"
            value={receipt.totalAmount > 0 ? String(receipt.totalAmount) : ""}
            onChange={(v: string) => setReceipt(r => r ? { ...r, totalAmount: parseFloat(v.replace(",", ".")) || 0 } : r)}
            keyboardType="decimal-pad"
          />
          <Field label="Materiais adquiridos" value={receipt.items} onChange={(v: string) => setReceipt(r => r ? { ...r, items: v } : r)} multiline />

          <TouchableOpacity
            style={[styles.sendBtn, sending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.sendBtnText}>Registrar Reembolso</Text>
                </>
            }
          </TouchableOpacity>
        </SectionCard>
      )}
    </ScrollView>
  );
}

function Field({ label, value, onChange, keyboardType, multiline }: { label: string; value: string; onChange: (v: string) => void; keyboardType?: any; multiline?: boolean }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && { minHeight: 70, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        autoCapitalize="none"
      />
    </View>
  );
}

function SectionCard({ title, done, onReset, children }: { title: string; done: boolean; onReset?: () => void; children: React.ReactNode }) {
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.header}>
        <View style={[cardStyles.dot, done && cardStyles.dotDone]}>
          {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
        </View>
        <Text style={cardStyles.title}>{title}</Text>
        {onReset && (
          <TouchableOpacity onPress={onReset} style={{ marginLeft: "auto" }}>
            <Text style={cardStyles.change}>Alterar</Text>
          </TouchableOpacity>
        )}
      </View>
      <View>{children}</View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: "#22C55E" },
  title: { fontSize: 14, fontWeight: "700", color: "#111827" },
  change: { fontSize: 12, color: "#EA580C", fontWeight: "600" },
});

const fieldStyles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 20 },
  listItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  listItemText: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectedText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  hint: { fontSize: 13, color: "#6B7280", marginBottom: 14, lineHeight: 18 },
  scanningBox: { alignItems: "center", gap: 10, paddingVertical: 24 },
  scanningText: { color: "#7C3AED", fontWeight: "600", fontSize: 14 },
  photoBtns: { flexDirection: "row", gap: 10 },
  photoBtn: {
    flex: 1, backgroundColor: "#EA580C", borderRadius: 10, paddingVertical: 13,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  photoBtnText: { color: "#fff", fontWeight: "700" },
  thumbImg: { width: "100%", height: 140, borderRadius: 10 },
  aiTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F5F3FF", borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, marginBottom: 14,
  },
  aiTagText: { fontSize: 12, color: "#7C3AED", fontWeight: "500" },
  sendBtn: {
    backgroundColor: "#16A34A", borderRadius: 10, paddingVertical: 14, marginTop: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
