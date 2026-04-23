import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Alert, ActivityIndicator, TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { projectsApi, photosApi } from "../../lib/api";

export default function FotosScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"project" | "task" | "photo">("project");

  useEffect(() => {
    projectsApi.list()
      .then((data: any) => setProjects(Array.isArray(data) ? data : (data?.data ?? [])))
      .catch(() => {});
  }, []);

  async function selectProject(id: string) {
    setProjectId(id);
    setLoading(true);
    try {
      const data = await projectsApi.tasks(id);
      setTasks(Array.isArray(data) ? data : []);
      setStep("task");
    } catch {
      setTasks([]);
      setStep("task");
    } finally {
      setLoading(false);
    }
  }

  async function pickImage(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (perm.status !== "granted") {
      Alert.alert("Permissão necessária", "Permita o acesso à câmera/galeria nas configurações.");
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: false });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  }

  async function handleSend() {
    if (!image) return;
    setSending(true);
    try {
      await photosApi.upload(projectId, taskId || null, image, caption);
      Alert.alert("✓ Foto enviada!", "Foto salva com sucesso.", [
        { text: "OK", onPress: () => { setImage(null); setCaption(""); setStep("project"); setProjectId(""); setTaskId(""); } },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSending(false);
    }
  }

  const selectedProject = projects.find(p => p.id === projectId);
  const selectedTask = tasks.find(t => t.id === taskId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Envio de Fotos</Text>

      {/* Step 1: Select project */}
      <StepHeader number={1} label="Selecionar Obra" done={!!projectId} onReset={step !== "project" ? () => { setStep("project"); setProjectId(""); setTaskId(""); setImage(null); } : undefined} />
      {step === "project" && (
        <View style={styles.listBox}>
          {projects.length === 0
            ? <Text style={styles.empty}>Carregando obras...</Text>
            : projects.map(p => (
                <TouchableOpacity key={p.id} style={styles.listItem} onPress={() => selectProject(p.id)} activeOpacity={0.7}>
                  <Ionicons name="business-outline" size={18} color="#EA580C" />
                  <Text style={styles.listItemText}>{p.name}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                </TouchableOpacity>
              ))
          }
        </View>
      )}
      {projectId && step !== "project" && (
        <View style={styles.selectedBadge}>
          <Ionicons name="business-outline" size={14} color="#EA580C" />
          <Text style={styles.selectedText}>{selectedProject?.name}</Text>
        </View>
      )}

      {/* Step 2: Select task */}
      {(step === "task" || step === "photo") && (
        <>
          <StepHeader number={2} label="Selecionar Item (opcional)" done={step === "photo"} onReset={step === "photo" ? () => { setStep("task"); setTaskId(""); setImage(null); } : undefined} />
          {step === "task" && (
            <View style={styles.listBox}>
              {loading
                ? <ActivityIndicator color="#EA580C" style={{ padding: 20 }} />
                : <>
                    <TouchableOpacity style={[styles.listItem, styles.skipItem]} onPress={() => setStep("photo")} activeOpacity={0.7}>
                      <Text style={styles.skipText}>Nenhum item específico →</Text>
                    </TouchableOpacity>
                    {tasks.map(t => (
                      <TouchableOpacity key={t.id} style={styles.listItem} onPress={() => { setTaskId(t.id); setStep("photo"); }} activeOpacity={0.7}>
                        <Ionicons name={t.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={16} color={t.isCompleted ? "#22C55E" : "#9CA3AF"} />
                        <Text style={styles.listItemText}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
              }
            </View>
          )}
          {step === "photo" && taskId && (
            <View style={styles.selectedBadge}>
              <Ionicons name="list-outline" size={14} color="#EA580C" />
              <Text style={styles.selectedText}>{selectedTask?.name}</Text>
            </View>
          )}
        </>
      )}

      {/* Step 3: Photo */}
      {step === "photo" && (
        <>
          <StepHeader number={3} label="Foto" done={false} />
          <View style={styles.photoBox}>
            {image
              ? <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
              : (
                <View style={styles.noPhoto}>
                  <Ionicons name="image-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.noPhotoText}>Nenhuma foto selecionada</Text>
                </View>
              )
            }
            <View style={styles.photoBtns}>
              <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(true)} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={styles.photoBtnText}>Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoBtn, { backgroundColor: "#374151" }]} onPress={() => pickImage(false)} activeOpacity={0.7}>
                <Ionicons name="images-outline" size={20} color="#fff" />
                <Text style={styles.photoBtnText}>Galeria</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="Legenda (opcional)..."
              placeholderTextColor="#9CA3AF"
              multiline
            />

            {image && (
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.8}
              >
                {sending
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                      <Text style={styles.sendBtnText}>Enviar Foto</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function StepHeader({ number, label, done, onReset }: { number: number; label: string; done: boolean; onReset?: () => void }) {
  return (
    <View style={stepStyles.row}>
      <View style={[stepStyles.circle, done && stepStyles.circleDone]}>
        {done
          ? <Ionicons name="checkmark" size={14} color="#fff" />
          : <Text style={stepStyles.num}>{number}</Text>
        }
      </View>
      <Text style={stepStyles.label}>{label}</Text>
      {onReset && (
        <TouchableOpacity onPress={onReset} style={{ marginLeft: "auto" }}>
          <Text style={stepStyles.change}>Alterar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  circle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center",
  },
  circleDone: { backgroundColor: "#22C55E" },
  num: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  label: { fontSize: 14, fontWeight: "700", color: "#111827" },
  change: { fontSize: 12, color: "#EA580C", fontWeight: "600" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 24 },
  listBox: {
    backgroundColor: "#fff", borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "#F3F4F6", marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  listItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F9FAFB",
  },
  listItemText: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  skipItem: { backgroundColor: "#FFFBF5" },
  skipText: { fontSize: 14, color: "#EA580C", fontWeight: "600" },
  empty: { padding: 20, color: "#9CA3AF", textAlign: "center" },
  selectedBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF7ED", borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, marginBottom: 20, alignSelf: "flex-start",
  },
  selectedText: { fontSize: 13, color: "#EA580C", fontWeight: "600" },
  photoBox: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 12, marginBottom: 20 },
  preview: { width: "100%", height: 220, borderRadius: 10 },
  noPhoto: {
    height: 160, borderRadius: 10, borderWidth: 2, borderStyle: "dashed",
    borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center", gap: 8,
  },
  noPhotoText: { color: "#9CA3AF", fontSize: 13 },
  photoBtns: { flexDirection: "row", gap: 10 },
  photoBtn: {
    flex: 1, backgroundColor: "#EA580C", borderRadius: 10, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  photoBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  captionInput: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: "#374151", minHeight: 60, textAlignVertical: "top",
  },
  sendBtn: {
    backgroundColor: "#16A34A", borderRadius: 10, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
