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

  // Reform Packages (ambientes)
  reformPackages: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/reform-packages${qs}`);
    },
    get: (id: string) => request(`/reform-packages/${id}`),
    create: (data: unknown) =>
      request("/reform-packages", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/reform-packages/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string, hard = false) =>
      request(`/reform-packages/${id}?hard=${hard}`, { method: "DELETE" }),
  },

  // Employees (funcionários)
  employees: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return requestPaginated(`/employees${qs}`);
    },
    get: (id: string) => request(`/employees/${id}`),
    create: (data: unknown) =>
      request("/employees", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/employees/${id}`, { method: "DELETE" }),
  },

  // Vehicles (veículos)
  vehicles: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return requestPaginated(`/vehicles${qs}`);
    },
    get: (id: string) => request(`/vehicles/${id}`),
    create: (data: unknown) =>
      request("/vehicles", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/vehicles/${id}`, { method: "DELETE" }),
    listMaintenance: (vehicleId: string) =>
      request(`/vehicles/${vehicleId}/maintenance`),
    createMaintenance: (vehicleId: string, data: unknown) =>
      request(`/vehicles/${vehicleId}/maintenance`, { method: "POST", body: JSON.stringify(data) }),
    updateMaintenance: (vehicleId: string, id: string, data: unknown) =>
      request(`/vehicles/${vehicleId}/maintenance/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteMaintenance: (vehicleId: string, id: string) =>
      request(`/vehicles/${vehicleId}/maintenance/${id}`, { method: "DELETE" }),
  },

  // Assignments (deslocamentos)
  assignments: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return requestPaginated(`/assignments${qs}`);
    },
    get: (id: string) => request(`/assignments/${id}`),
    create: (data: unknown) =>
      request("/assignments", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/assignments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/assignments/${id}`, { method: "DELETE" }),
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

  // Service Providers (prestadores de serviços)
  serviceProviders: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return requestPaginated(`/service-providers${qs}`);
    },
    get: (id: string) => request(`/service-providers/${id}`),
    create: (data: unknown) =>
      request("/service-providers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/service-providers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    inactivate: (id: string) =>
      request(`/service-providers/${id}/inactivate`, { method: "PATCH" }),
    delete: (id: string) =>
      request(`/service-providers/${id}`, { method: "DELETE" }),
    history: (id: string) => request(`/service-providers/${id}/history`),
    // Work links
    listByProject: (projectId: string) =>
      request(`/projects/${projectId}/service-providers`),
    linkToProject: (projectId: string, data: unknown) =>
      request(`/projects/${projectId}/service-providers`, { method: "POST", body: JSON.stringify(data) }),
    updateLink: (projectId: string, linkId: string, data: unknown) =>
      request(`/projects/${projectId}/service-providers/${linkId}`, { method: "PATCH", body: JSON.stringify(data) }),
    removeLink: (projectId: string, linkId: string) =>
      request(`/projects/${projectId}/service-providers/${linkId}`, { method: "DELETE" }),
  },

  // Company Settings
  companySettings: {
    get: () => request("/company-settings"),
    update: (data: unknown) =>
      request("/company-settings", { method: "PUT", body: JSON.stringify(data) }),
  },

  // Contract Templates (Modelos de Contrato)
  contractTemplates: {
    list: () => request("/contract-templates"),
    get: (id: string) => request(`/contract-templates/${id}`),
    create: (data: unknown) =>
      request("/contract-templates", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/contract-templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/contract-templates/${id}`, { method: "DELETE" }),
  },

  // Contracts (Contratos)
  contracts: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/contracts${qs}`);
    },
    get: (id: string) => request(`/contracts/${id}`),
    create: (data: unknown) =>
      request("/contracts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/contracts/${id}`, { method: "DELETE" }),
    sign: (id: string, signedFileUrl: string) =>
      request(`/contracts/${id}/sign`, { method: "PATCH", body: JSON.stringify({ signedFileUrl }) }),
  },

  // Personal Expenses (Gastos Pessoais)
  personalExpenses: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return requestPaginated(`/personal-expenses${qs}`);
    },
    get: (id: string) => request(`/personal-expenses/${id}`),
    create: (data: unknown) =>
      request("/personal-expenses", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/personal-expenses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    pay: (id: string, paidDate?: string) =>
      request(`/personal-expenses/${id}/pay`, { method: "PATCH", body: JSON.stringify({ paidDate }) }),
    delete: (id: string) =>
      request(`/personal-expenses/${id}`, { method: "DELETE" }),
    summary: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/personal-expenses/summary${qs}`);
    },
  },
  // Suppliers / Creditors
  suppliers: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/suppliers${qs}`);
    },
    create: (data: unknown) =>
      request("/suppliers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/suppliers/${id}`, { method: "DELETE" }),
  },
  // Obras Parcerias
  partnershipBuyers: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/partnership-buyers${qs}`);
    },
    get: (id: string) => request(`/partnership-buyers/${id}`),
    create: (data: unknown) =>
      request("/partnership-buyers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/partnership-buyers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/partnership-buyers/${id}`, { method: "DELETE" }),
  },
  partnershipProjects: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return requestPaginated(`/partnership-projects${qs}`);
    },
    get: (id: string) => request(`/partnership-projects/${id}`),
    create: (data: unknown) =>
      request("/partnership-projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/partnership-projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/partnership-projects/${id}`, { method: "DELETE" }),
    // Materials
    listMaterials: (id: string) => request(`/partnership-projects/${id}/materials`),
    createMaterial: (id: string, data: unknown) =>
      request(`/partnership-projects/${id}/materials`, { method: "POST", body: JSON.stringify(data) }),
    updateMaterial: (id: string, materialId: string, data: unknown) =>
      request(`/partnership-projects/${id}/materials/${materialId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteMaterial: (id: string, materialId: string) =>
      request(`/partnership-projects/${id}/materials/${materialId}`, { method: "DELETE" }),
    // Expenses
    listExpenses: (id: string) => request(`/partnership-projects/${id}/expenses`),
    createExpense: (id: string, data: unknown) =>
      request(`/partnership-projects/${id}/expenses`, { method: "POST", body: JSON.stringify(data) }),
    updateExpense: (id: string, expenseId: string, data: unknown) =>
      request(`/partnership-projects/${id}/expenses/${expenseId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteExpense: (id: string, expenseId: string) =>
      request(`/partnership-projects/${id}/expenses/${expenseId}`, { method: "DELETE" }),
    // Service Providers
    listProviders: (id: string) => request(`/partnership-projects/${id}/service-providers`),
    createProvider: (id: string, data: unknown) =>
      request(`/partnership-projects/${id}/service-providers`, { method: "POST", body: JSON.stringify(data) }),
    updateProvider: (id: string, spId: string, data: unknown) =>
      request(`/partnership-projects/${id}/service-providers/${spId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteProvider: (id: string, spId: string) =>
      request(`/partnership-projects/${id}/service-providers/${spId}`, { method: "DELETE" }),
  },
  personalProjects: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return requestPaginated(`/personal-projects${qs}`);
    },
    get: (id: string) => request(`/personal-projects/${id}`),
    create: (data: unknown) =>
      request("/personal-projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request(`/personal-projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/personal-projects/${id}`, { method: "DELETE" }),
    listMaterials: (id: string) => request(`/personal-projects/${id}/materials`),
    createMaterial: (id: string, data: unknown) =>
      request(`/personal-projects/${id}/materials`, { method: "POST", body: JSON.stringify(data) }),
    updateMaterial: (id: string, materialId: string, data: unknown) =>
      request(`/personal-projects/${id}/materials/${materialId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteMaterial: (id: string, materialId: string) =>
      request(`/personal-projects/${id}/materials/${materialId}`, { method: "DELETE" }),
    listExpenses: (id: string) => request(`/personal-projects/${id}/expenses`),
    createExpense: (id: string, data: unknown) =>
      request(`/personal-projects/${id}/expenses`, { method: "POST", body: JSON.stringify(data) }),
    updateExpense: (id: string, expenseId: string, data: unknown) =>
      request(`/personal-projects/${id}/expenses/${expenseId}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteExpense: (id: string, expenseId: string) =>
      request(`/personal-projects/${id}/expenses/${expenseId}`, { method: "DELETE" }),
    listProviders: (id: string) => request(`/personal-projects/${id}/service-providers`),
    createProvider: (id: string, data: unknown) =>
      request(`/personal-projects/${id}/service-providers`, { method: "POST", body: JSON.stringify(data) }),
    updateProvider: (id: string, spId: string, data: unknown) =>
      request(`/personal-projects/${id}/service-providers/${spId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteProvider: (id: string, spId: string) =>
      request(`/personal-projects/${id}/service-providers/${spId}`, { method: "DELETE" }),
  },
};

export { ApiError };
