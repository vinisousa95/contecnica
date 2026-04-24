import { router } from "expo-router";
import { API_BASE_URL } from "./config";
import { getMemoryToken } from "./token";
import { clearAuth } from "./auth";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getMemoryToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (res.status === 401) {
    await clearAuth();
    router.replace("/login");
    throw new Error("Sessão expirada");
  }
  if (!res.ok) throw new Error(json.error ?? "Erro na requisição");
  return json.data ?? json;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

export const projectsApi = {
  list: () => request<any[]>("/api/v1/projects?limit=100"),
  tasks: (projectId: string) =>
    request<any[]>(`/api/v1/projects/${projectId}/tasks`),
  updateTask: (projectId: string, taskId: string, data: object) =>
    request(`/api/v1/projects/${projectId}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const photosApi = {
  upload: async (projectId: string, taskId: string | null, uri: string, caption?: string) => {
    const token = getMemoryToken();
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: `photo_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);
    if (taskId) formData.append("taskId", taskId);
    if (caption) formData.append("caption", caption);

    const res = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/photos`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Erro ao enviar foto");
    return json.data;
  },
};

export const expensesApi = {
  create: (data: object) =>
    request("/api/v1/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  categories: () => request<any[]>("/api/v1/categories?type=EXPENSE"),
};

export const employeesApi = {
  list: () => request<any[]>("/api/v1/employees?status=ACTIVE&limit=100"),
};
