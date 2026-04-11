const BASE_URL = "/api/v1";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiError(json.error ?? "Erro desconhecido", res.status);
  }

  return json.data as T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function requestPaginated<T>(
  path: string,
  options?: RequestInit
): Promise<PaginatedResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiError(json.error ?? "Erro desconhecido", res.status);
  }

  return { data: json.data, pagination: json.pagination };
}

export const api = {
  // Auth
  auth: {
    login: (data: { email: string; password: string }) =>
      request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    logout: () =>
      request("/auth/logout", { method: "POST" }),
    me: () =>
      request("/auth/me"),
  },

  // Dashboard
  dashboard: {
    summary: () => request("/dashboard"),
  },

  // Clients
  clients: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/clients${qs}`);
    },
    get: (id: string) => request(`/clients/${id}`),
    create: (data: unknown) =>
      request("/clients", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/clients/${id}`, { method: "DELETE" }),
  },

  // Projects
  projects: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/projects${qs}`);
    },
    get: (id: string) => request(`/projects/${id}`),
    create: (data: unknown) =>
      request("/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/projects/${id}`, { method: "DELETE" }),
    summary: (id: string) => request(`/projects/${id}/summary`),
  },

  // Expenses
  expenses: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/expenses${qs}`);
    },
    get: (id: string) => request(`/expenses/${id}`),
    create: (data: unknown) =>
      request("/expenses", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/expenses/${id}`, { method: "DELETE" }),
  },

  // Revenues
  revenues: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/revenues${qs}`);
    },
    get: (id: string) => request(`/revenues/${id}`),
    create: (data: unknown) =>
      request("/revenues", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/revenues/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/revenues/${id}`, { method: "DELETE" }),
  },

  // Categories
  categories: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/categories${qs}`);
    },
    create: (data: unknown) =>
      request("/categories", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/categories/${id}`, { method: "DELETE" }),
  },

  // Users
  users: {
    list: () => request("/users"),
    create: (data: unknown) =>
      request("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/users/${id}`, { method: "DELETE" }),
  },

  // Reports
  reports: {
    cashflow: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/reports/cashflow${qs}`);
    },
    projects: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/reports/projects${qs}`);
    },
  },

  // Reform Items (catálogo)
  reformItems: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/reform-items${qs}`);
    },
    get: (id: string) => request(`/reform-items/${id}`),
    create: (data: unknown) =>
      request("/reform-items", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/reform-items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/reform-items/${id}`, { method: "DELETE" }),
  },

  // Budgets (orçamentos)
  budgets: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return requestPaginated(`/budgets${qs}`);
    },
    get: (id: string) => request(`/budgets/${id}`),
    create: (data: unknown) =>
      request("/budgets", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/budgets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/budgets/${id}`, { method: "DELETE" }),
    duplicate: (id: string) =>
      request(`/budgets/${id}/duplicate`, { method: "POST" }),
    updateStatus: (id: string, status: string) =>
      request(`/budgets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },
};

export { ApiError };
