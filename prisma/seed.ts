import { PrismaClient, UserRole, ClientStatus, ProjectStatus, CategoryType, ExpenseStatus, RevenueStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // ── Admin user ────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@contecnica.com.br" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@contecnica.com.br",
      passwordHash,
      role: UserRole.ADMIN,
      phone: "(11) 99999-0001",
    },
  });

  console.log(`✅ Admin criado: ${admin.email}`);

  // ── Categories ────────────────────────────────────────────────
  const categories = [
    { name: "Material de Construção", type: CategoryType.EXPENSE, color: "#F59E0B" },
    { name: "Mão de Obra", type: CategoryType.EXPENSE, color: "#EF4444" },
    { name: "Transporte", type: CategoryType.EXPENSE, color: "#8B5CF6" },
    { name: "Ferramentas e Equipamentos", type: CategoryType.EXPENSE, color: "#06B6D4" },
    { name: "Alimentação", type: CategoryType.EXPENSE, color: "#F97316" },
    { name: "Administrativo", type: CategoryType.EXPENSE, color: "#6B7280" },
    { name: "Serviços Terceirizados", type: CategoryType.EXPENSE, color: "#EC4899" },
    { name: "Outros Custos", type: CategoryType.EXPENSE, color: "#9CA3AF" },
    { name: "Pagamento de Obra", type: CategoryType.INCOME, color: "#10B981" },
    { name: "Adiantamento", type: CategoryType.INCOME, color: "#34D399" },
    { name: "Medição", type: CategoryType.INCOME, color: "#059669" },
    { name: "Sinal / Entrada", type: CategoryType.INCOME, color: "#6EE7B7" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log(`✅ ${categories.length} categorias criadas`);

  // ── Clients ───────────────────────────────────────────────────
  const client1 = await prisma.client.upsert({
    where: { document: "123.456.789-00" },
    update: {},
    create: {
      name: "João Silva",
      document: "123.456.789-00",
      phone: "(11) 98765-4321",
      email: "joao.silva@email.com",
      street: "Rua das Flores",
      number: "123",
      neighborhood: "Jardim Primavera",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100",
      status: ClientStatus.ACTIVE,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { document: "98.765.432/0001-10" },
    update: {},
    create: {
      name: "Empresa Construções Ltda",
      document: "98.765.432/0001-10",
      phone: "(11) 3333-4444",
      email: "contato@construcoes.com.br",
      street: "Av. Paulista",
      number: "1000",
      complement: "Sala 205",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-200",
      status: ClientStatus.ACTIVE,
    },
  });

  const client3 = await prisma.client.upsert({
    where: { document: "987.654.321-00" },
    update: {},
    create: {
      name: "Maria Fernanda Costa",
      document: "987.654.321-00",
      phone: "(11) 91234-5678",
      email: "mariafernanda@gmail.com",
      street: "Rua Consolação",
      number: "500",
      neighborhood: "Consolação",
      city: "São Paulo",
      state: "SP",
      zipCode: "01301-000",
      status: ClientStatus.ACTIVE,
    },
  });

  console.log("✅ 3 clientes criados");

  // ── Projects ──────────────────────────────────────────────────
  const project1 = await prisma.project.create({
    data: {
      name: "Reforma Apartamento Jardim Primavera",
      clientId: client1.id,
      street: "Rua das Flores",
      number: "123",
      neighborhood: "Jardim Primavera",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100",
      description: "Reforma completa de apartamento de 80m². Inclui pintura, piso, hidráulica e elétrica.",
      startDate: new Date("2024-01-10"),
      expectedEndDate: new Date("2024-04-30"),
      status: ProjectStatus.IN_PROGRESS,
      budget: 45000,
      notes: "Cliente prefere trabalho aos sábados também.",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Reforma Escritório Av. Paulista",
      clientId: client2.id,
      street: "Av. Paulista",
      number: "1000",
      complement: "Sala 205",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-200",
      description: "Reforma de escritório comercial. Divisórias, elétrica e acabamento.",
      startDate: new Date("2024-02-01"),
      expectedEndDate: new Date("2024-03-31"),
      status: ProjectStatus.COMPLETED,
      budget: 28000,
      actualEndDate: new Date("2024-03-28"),
      notes: "Obra concluída dentro do prazo.",
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: "Banheiro e Cozinha - Consolação",
      clientId: client3.id,
      street: "Rua Consolação",
      number: "500",
      neighborhood: "Consolação",
      city: "São Paulo",
      state: "SP",
      zipCode: "01301-000",
      description: "Reforma de banheiro e cozinha. Troca de revestimentos, metais e marcenaria.",
      startDate: new Date("2024-03-15"),
      expectedEndDate: new Date("2024-05-15"),
      status: ProjectStatus.PLANNING,
      budget: 18000,
    },
  });

  console.log("✅ 3 projetos criados");

  // ── Categories lookup ────────────────────────────────────────
  const catMaterial = await prisma.category.findFirst({ where: { name: "Material de Construção" } });
  const catMaodeObra = await prisma.category.findFirst({ where: { name: "Mão de Obra" } });
  const catTransporte = await prisma.category.findFirst({ where: { name: "Transporte" } });
  const catPagamento = await prisma.category.findFirst({ where: { name: "Pagamento de Obra" } });
  const catSinal = await prisma.category.findFirst({ where: { name: "Sinal / Entrada" } });
  const catMedicao = await prisma.category.findFirst({ where: { name: "Medição" } });

  // ── Expenses ─────────────────────────────────────────────────
  const expenses = [
    {
      projectId: project1.id,
      categoryId: catMaterial!.id,
      createdById: admin.id,
      description: "Compra de piso porcelanato 60x60",
      supplier: "Casa do Piso",
      amount: 3200,
      dueDate: new Date("2024-01-20"),
      paymentDate: new Date("2024-01-20"),
      status: ExpenseStatus.PAID,
      paymentMethod: "PIX",
    },
    {
      projectId: project1.id,
      categoryId: catMaodeObra!.id,
      createdById: admin.id,
      description: "Mão de obra pedreiro - Semana 1",
      supplier: "Carlos Pedreiro",
      amount: 1800,
      dueDate: new Date("2024-01-27"),
      paymentDate: new Date("2024-01-27"),
      status: ExpenseStatus.PAID,
      paymentMethod: "PIX",
    },
    {
      projectId: project1.id,
      categoryId: catMaterial!.id,
      createdById: admin.id,
      description: "Tinta latex premium - 20 latas",
      supplier: "Tintas Brasil",
      amount: 1400,
      dueDate: new Date("2024-02-05"),
      paymentDate: new Date("2024-02-05"),
      status: ExpenseStatus.PAID,
      paymentMethod: "Cartão",
    },
    {
      projectId: project1.id,
      categoryId: catTransporte!.id,
      createdById: admin.id,
      description: "Frete de materiais",
      supplier: "Transportadora Rápida",
      amount: 350,
      dueDate: new Date("2024-02-10"),
      status: ExpenseStatus.PENDING,
      paymentMethod: "PIX",
    },
    {
      projectId: project2.id,
      categoryId: catMaterial!.id,
      createdById: admin.id,
      description: "Divisórias de drywall",
      supplier: "Construmix",
      amount: 4500,
      dueDate: new Date("2024-02-10"),
      paymentDate: new Date("2024-02-10"),
      status: ExpenseStatus.PAID,
      paymentMethod: "Transferência",
    },
    {
      projectId: project2.id,
      categoryId: catMaodeObra!.id,
      createdById: admin.id,
      description: "Mão de obra elétrica",
      supplier: "Eletro Silva",
      amount: 3200,
      dueDate: new Date("2024-03-15"),
      paymentDate: new Date("2024-03-15"),
      status: ExpenseStatus.PAID,
      paymentMethod: "PIX",
    },
    {
      projectId: null,
      categoryId: null,
      createdById: admin.id,
      description: "Aluguel escritório administrativo",
      supplier: "Imobiliária Central",
      amount: 2200,
      dueDate: new Date("2024-04-05"),
      status: ExpenseStatus.PENDING,
      paymentMethod: "Boleto",
    },
    {
      projectId: null,
      categoryId: null,
      createdById: admin.id,
      description: "Conta de telefone e internet",
      supplier: "Operadora Telecom",
      amount: 280,
      dueDate: new Date("2024-03-20"),
      status: ExpenseStatus.OVERDUE,
      paymentMethod: "Débito automático",
    },
  ];

  for (const exp of expenses) {
    await prisma.expense.create({ data: exp as any });
  }

  console.log(`✅ ${expenses.length} despesas criadas`);

  // ── Revenues ──────────────────────────────────────────────────
  const revenues = [
    {
      projectId: project1.id,
      clientId: client1.id,
      categoryId: catSinal!.id,
      createdById: admin.id,
      description: "Sinal de entrada - Reforma Apto",
      amount: 9000,
      dueDate: new Date("2024-01-10"),
      receivedDate: new Date("2024-01-10"),
      status: RevenueStatus.RECEIVED,
      paymentMethod: "PIX",
    },
    {
      projectId: project1.id,
      clientId: client1.id,
      categoryId: catMedicao!.id,
      createdById: admin.id,
      description: "1ª Medição - Reforma Apto",
      amount: 13500,
      dueDate: new Date("2024-02-15"),
      receivedDate: new Date("2024-02-16"),
      status: RevenueStatus.RECEIVED,
      paymentMethod: "Transferência",
    },
    {
      projectId: project1.id,
      clientId: client1.id,
      categoryId: catMedicao!.id,
      createdById: admin.id,
      description: "2ª Medição - Reforma Apto",
      amount: 13500,
      dueDate: new Date("2024-03-25"),
      status: RevenueStatus.PENDING,
      paymentMethod: "Transferência",
    },
    {
      projectId: project1.id,
      clientId: client1.id,
      categoryId: catPagamento!.id,
      createdById: admin.id,
      description: "Saldo final - Reforma Apto",
      amount: 9000,
      dueDate: new Date("2024-04-30"),
      status: RevenueStatus.PENDING,
      paymentMethod: "PIX",
    },
    {
      projectId: project2.id,
      clientId: client2.id,
      categoryId: catSinal!.id,
      createdById: admin.id,
      description: "Entrada - Reforma Escritório",
      amount: 8400,
      dueDate: new Date("2024-02-01"),
      receivedDate: new Date("2024-02-01"),
      status: RevenueStatus.RECEIVED,
      paymentMethod: "Transferência",
    },
    {
      projectId: project2.id,
      clientId: client2.id,
      categoryId: catPagamento!.id,
      createdById: admin.id,
      description: "Pagamento final - Reforma Escritório",
      amount: 19600,
      dueDate: new Date("2024-03-28"),
      receivedDate: new Date("2024-03-29"),
      status: RevenueStatus.RECEIVED,
      paymentMethod: "Transferência",
    },
  ];

  for (const rev of revenues) {
    await prisma.revenue.create({ data: rev as any });
  }

  console.log(`✅ ${revenues.length} receitas criadas`);

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("─────────────────────────────────────");
  console.log("📧 Login:  admin@contecnica.com.br");
  console.log("🔑 Senha:  admin123");
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
