import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

// ── Users ─────────────────────────────────────────────────────
export const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("ADMIN"),
  phone: z.string().optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .extend({
    password: z.string().min(6).optional().or(z.literal("")),
    isActive: z.boolean().optional(),
  });

// ── Clients ───────────────────────────────────────────────────
export const clientSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  document: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  zipCode: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// ── Projects ──────────────────────────────────────────────────
export const projectSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  clientId: z.string().min(1, "Cliente é obrigatório"),
  zipCode: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  expectedEndDate: z.string().optional().nullable(),
  status: z.enum(["PLANNING", "IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELLED"]).default("PLANNING"),
  budget: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  progress: z.number().int().min(0).max(100).default(0),
});

// ── Expenses ──────────────────────────────────────────────────
export const expenseSchema = z.object({
  projectId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  description: z.string().min(2, "Descrição é obrigatória"),
  supplier: z.string().optional().nullable(),
  amount: z.string().min(1, "Valor é obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  paymentDate: z.string().optional().nullable(),
  status: z.enum(["PENDING", "PAID", "OVERDUE"]).default("PENDING"),
  paymentMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  visibleInPortal: z.boolean().default(false).optional(),
  attachmentUrl: z.string().optional().nullable(),
});

// ── Revenues ──────────────────────────────────────────────────
export const revenueSchema = z.object({
  projectId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  description: z.string().min(2, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  receivedDate: z.string().optional().nullable(),
  status: z.enum(["PENDING", "RECEIVED", "OVERDUE"]).default("PENDING"),
  paymentMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ── Categories ────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  type: z.enum(["EXPENSE", "INCOME", "BOTH"]),
  color: z.string().optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type RevenueInput = z.infer<typeof revenueSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;

// ── Reform Items ──────────────────────────────────────────────
export const reformItemSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  description: z.string().optional().nullable(),
  category: z.enum([
    "DEMOLITION","PAINTING","MASONRY","ELECTRICAL","PLUMBING",
    "FINISHING","CLEANING","JOINERY","TILING","CARPENTRY","OTHERS",
  ]),
  unit: z.enum(["UNIT","SQM","M","DAILY","SERVICE","POINT","HOUR"]).default("UNIT"),
  priceLow: z.string().min(1, "Preço padrão baixo é obrigatório"),
  priceMedium: z.string().min(1, "Preço padrão médio é obrigatório"),
  priceHigh: z.string().min(1, "Preço padrão alto é obrigatório"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().optional().default(0),
});

// ── Budget Extra Item ─────────────────────────────────────────
export const budgetExtraItemSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  quantity: z.number().min(0.001, "Quantidade deve ser maior que 0"),
  unit: z.enum(["UNIT","SQM","M","DAILY","SERVICE","POINT","HOUR"]).default("UNIT"),
  unitPrice: z.number().min(0, "Valor deve ser maior ou igual a 0"),
  subtotal: z.number(),
});

// ── Budget ────────────────────────────────────────────────────
export const budgetItemSchema = z.object({
  reformItemId: z.string().min(1),
  quantity: z.number().min(0.001, "Quantidade deve ser maior que 0"),
  unitPrice: z.number().min(0),
  subtotal: z.number(),
});

export const budgetSchema = z.object({
  clientId: z.string().min(1, "Cliente é obrigatório"),
  title: z.string().min(2, "Título é obrigatório"),
  tier: z.enum(["HIGH","MEDIUM","LOW"]),
  status: z.enum(["DRAFT","UNDER_REVIEW","SENT","APPROVED","REJECTED","CANCELLED"]).optional(),
  notes: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  discount: z.number().min(0).max(100).default(0).optional(),
  items: z.array(budgetItemSchema).default([]),
  extraItems: z.array(budgetExtraItemSchema).default([]),
});

export type ReformItemInput = z.infer<typeof reformItemSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type BudgetItemInput = z.infer<typeof budgetItemSchema>;
export type BudgetExtraItemInput = z.infer<typeof budgetExtraItemSchema>;

// ── Employees ─────────────────────────────────────────────────
export const employeeSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  phone: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().optional().nullable(),
});

// ── Vehicles ──────────────────────────────────────────────────
export const vehicleSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  model: z.string().optional().nullable(),
  plate: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  year: z.number().int().optional().nullable(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().optional().nullable(),
});

// ── Assignments ───────────────────────────────────────────────
export const assignmentSchema = z.object({
  employeeId: z.string().min(1, "Funcionário é obrigatório"),
  vehicleId: z.string().optional().nullable(),
  projectId: z.string().min(1, "Obra é obrigatória"),
  date: z.string().min(1, "Data é obrigatória"),
  departureTime: z.string().optional().nullable(),
  returnTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("SCHEDULED"),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
