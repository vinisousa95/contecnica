import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { projectsApi, employeesApi } from "../../lib/api";

type Step = "project" | "tasks" | "employee";

export default function TarefasScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectId, setProjectId] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>("project");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    projectsApi.list().then((data: any) => {
      setProjects(Array.isArray(data) ? data : (data?.data ?? []));
    });
    employeesApi.list().then((data: any) => {
      setEmployees(Array.isArray(data) ? data : []);
    });
  }, []);

  async function selectProject(id: string) {
    setProjectId(id);
    setSelectedTasks(new Set());
    setLoading(true);
    try {
      const data = await projectsApi.tasks(id);
      setTasks(Array.isArray(data) ? data : []);
      setStep("tasks");
    } catch {
      setTasks([]);
      setStep("tasks");
    } finally {
      setLoading(false);
    }
  }

  function toggleTask(id: string) {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function markCompleted() {
    if (selectedTasks.size === 0) {
      Alert.alert("Atenção", "Selecione pelo menos uma tarefa.");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        Array.from(selectedTasks).map(taskId =>
          projectsApi.updateTask(projectId, taskId, { isCompleted: true })
        )
      );
      // Refresh tasks
      const data = await projectsApi.tasks(projectId);
      setTasks(Array.isArray(data) ? data : []);
      setSelectedTasks(new Set());
      Alert.alert("✓ Concluído!", `${selectedTasks.size} tarefa(s) marcadas como concluídas.`);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedProject = projects.find(p => p.id === projectId);
  const pending = tasks.filter(t => !t.isCompleted);
  const done = tasks.filter(t => t.isCompleted);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Execução de Tarefas</Text>

      {/* Project selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Obra</Text>
          {projectId && (
            <TouchableOpacity onPress={() => { setStep("project"); setProjectId(""); setTasks([]); }}>
              <Text style={styles.changeBtn}>Alterar</Text>
            </TouchableOpacity>
          )}
        </View>

        {step === "project" ? (
          <View style={styles.card}>
            {projects.length === 0
              ? <ActivityIndicator color="#EA580C" style={{ padding: 20 }} />
              : projects.map(p => (
                  <TouchableOpacity key={p.id} style={styles.listItem} onPress={() => selectProject(p.id)} activeOpacity={0.7}>
                    <Ionicons name="business-outline" size={16} color="#EA580C" />
                    <Text style={styles.listItemText}>{p.name}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                  </TouchableOpacity>
                ))
            }
          </View>
        ) : (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={15} color="#22C55E" />
            <Text style={styles.selectedText}>{selectedProject?.name}</Text>
          </View>
        )}
      </View>

      {/* Tasks */}
      {step !== "project" && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tarefas</Text>
            {selectedTasks.size > 0 && (
              <Text style={styles.countBadge}>{selectedTasks.size} selecionada(s)</Text>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color="#EA580C" style={{ padding: 20 }} />
          ) : (
            <>
              {/* Pending tasks */}
              {pending.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.groupLabel}>Pendentes ({pending.length})</Text>
                  {pending.map(t => {
                    const sel = selectedTasks.has(t.id);
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.taskItem, sel && styles.taskItemSelected]}
                        onPress={() => toggleTask(t.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, sel && styles.checkboxChecked]}>
                          {sel && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <Text style={[styles.taskName, sel && { color: "#EA580C" }]}>{t.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Done tasks */}
              {done.length > 0 && (
                <View style={[styles.card, { marginTop: 10 }]}>
                  <Text style={styles.groupLabel}>Concluídas ({done.length})</Text>
                  {done.map(t => (
                    <View key={t.id} style={styles.taskItem}>
                      <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                      <Text style={[styles.taskName, styles.taskDone]}>{t.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {tasks.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Nenhuma tarefa encontrada para esta obra.</Text>
                </View>
              )}

              {/* Action button */}
              {selectedTasks.size > 0 && (
                <TouchableOpacity
                  style={[styles.actionBtn, saving && { opacity: 0.6 }]}
                  onPress={markCompleted}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="checkmark-done-circle-outline" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>
                          Marcar {selectedTasks.size} como Concluída(s)
                        </Text>
                      </>
                  }
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },
  changeBtn: { fontSize: 12, color: "#EA580C", fontWeight: "600" },
  countBadge: { fontSize: 12, color: "#EA580C", fontWeight: "700", backgroundColor: "#FFF7ED", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  card: {
    backgroundColor: "#fff", borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "#F3F4F6",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  listItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F9FAFB",
  },
  listItemText: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  selectedBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F0FDF4", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start",
  },
  selectedText: { fontSize: 13, color: "#374151", fontWeight: "600" },
  groupLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  taskItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F9FAFB",
  },
  taskItemSelected: { backgroundColor: "#FFF7ED" },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  taskName: { flex: 1, fontSize: 14, color: "#374151", fontWeight: "500" },
  taskDone: { color: "#9CA3AF", textDecorationLine: "line-through" },
  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { color: "#9CA3AF", fontSize: 13 },
  actionBtn: {
    backgroundColor: "#EA580C", borderRadius: 12, paddingVertical: 14, marginTop: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
