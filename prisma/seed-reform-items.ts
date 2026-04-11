import { PrismaClient, ItemCategory, ItemUnit } from "@prisma/client";

const prisma = new PrismaClient();

const reformItems = [
  // DEMOLIÇÃO
  { name: "Remoção de porta", category: ItemCategory.DEMOLITION, unit: ItemUnit.UNIT, priceLow: 80, priceMedium: 120, priceHigh: 200, sortOrder: 1 },
  { name: "Remoção de janela", category: ItemCategory.DEMOLITION, unit: ItemUnit.UNIT, priceLow: 80, priceMedium: 120, priceHigh: 200, sortOrder: 2 },
  { name: "Demolição de parede", category: ItemCategory.DEMOLITION, unit: ItemUnit.SQM, priceLow: 30, priceMedium: 55, priceHigh: 90, sortOrder: 3 },
  { name: "Retirada de entulho", category: ItemCategory.DEMOLITION, unit: ItemUnit.SERVICE, priceLow: 400, priceMedium: 700, priceHigh: 1200, sortOrder: 4 },
  { name: "Remoção de piso", category: ItemCategory.DEMOLITION, unit: ItemUnit.SQM, priceLow: 15, priceMedium: 25, priceHigh: 45, sortOrder: 5 },
  { name: "Remoção de revestimento", category: ItemCategory.DEMOLITION, unit: ItemUnit.SQM, priceLow: 15, priceMedium: 25, priceHigh: 45, sortOrder: 6 },

  // PINTURA
  { name: "Pintura de parede (latex)", category: ItemCategory.PAINTING, unit: ItemUnit.SQM, priceLow: 12, priceMedium: 22, priceHigh: 40, sortOrder: 10 },
  { name: "Pintura de teto", category: ItemCategory.PAINTING, unit: ItemUnit.SQM, priceLow: 18, priceMedium: 30, priceHigh: 55, sortOrder: 11 },
  { name: "Pintura externa", category: ItemCategory.PAINTING, unit: ItemUnit.SQM, priceLow: 18, priceMedium: 32, priceHigh: 60, sortOrder: 12 },
  { name: "Massa corrida", category: ItemCategory.PAINTING, unit: ItemUnit.SQM, priceLow: 10, priceMedium: 18, priceHigh: 32, sortOrder: 13 },
  { name: "Aplicação de textura", category: ItemCategory.PAINTING, unit: ItemUnit.SQM, priceLow: 14, priceMedium: 24, priceHigh: 45, sortOrder: 14 },
  { name: "Pintura com tinta acrílica premium", category: ItemCategory.PAINTING, unit: ItemUnit.SQM, priceLow: 20, priceMedium: 35, priceHigh: 65, sortOrder: 15 },

  // ALVENARIA
  { name: "Construção de parede", category: ItemCategory.MASONRY, unit: ItemUnit.SQM, priceLow: 80, priceMedium: 130, priceHigh: 220, sortOrder: 20 },
  { name: "Reboco / chapisco", category: ItemCategory.MASONRY, unit: ItemUnit.SQM, priceLow: 18, priceMedium: 32, priceHigh: 55, sortOrder: 21 },
  { name: "Gesso liso", category: ItemCategory.MASONRY, unit: ItemUnit.SQM, priceLow: 22, priceMedium: 38, priceHigh: 65, sortOrder: 22 },
  { name: "Forro de drywall", category: ItemCategory.MASONRY, unit: ItemUnit.SQM, priceLow: 50, priceMedium: 80, priceHigh: 140, sortOrder: 23 },
  { name: "Impermeabilização", category: ItemCategory.MASONRY, unit: ItemUnit.SQM, priceLow: 28, priceMedium: 48, priceHigh: 90, sortOrder: 24 },
  { name: "Reparo de telhado", category: ItemCategory.MASONRY, unit: ItemUnit.SERVICE, priceLow: 800, priceMedium: 1500, priceHigh: 3000, sortOrder: 25 },

  // ELÉTRICA
  { name: "Instalação de ponto elétrico", category: ItemCategory.ELECTRICAL, unit: ItemUnit.POINT, priceLow: 100, priceMedium: 180, priceHigh: 320, sortOrder: 30 },
  { name: "Troca de tomada", category: ItemCategory.ELECTRICAL, unit: ItemUnit.UNIT, priceLow: 50, priceMedium: 90, priceHigh: 170, sortOrder: 31 },
  { name: "Troca de interruptor", category: ItemCategory.ELECTRICAL, unit: ItemUnit.UNIT, priceLow: 50, priceMedium: 90, priceHigh: 170, sortOrder: 32 },
  { name: "Instalação de luminária", category: ItemCategory.ELECTRICAL, unit: ItemUnit.UNIT, priceLow: 70, priceMedium: 130, priceHigh: 250, sortOrder: 33 },
  { name: "Instalação de quadro elétrico", category: ItemCategory.ELECTRICAL, unit: ItemUnit.SERVICE, priceLow: 500, priceMedium: 900, priceHigh: 1800, sortOrder: 34 },
  { name: "Revisão elétrica geral", category: ItemCategory.ELECTRICAL, unit: ItemUnit.SERVICE, priceLow: 600, priceMedium: 1100, priceHigh: 2200, sortOrder: 35 },

  // HIDRÁULICA
  { name: "Instalação de pia", category: ItemCategory.PLUMBING, unit: ItemUnit.UNIT, priceLow: 180, priceMedium: 320, priceHigh: 580, sortOrder: 40 },
  { name: "Instalação de vaso sanitário", category: ItemCategory.PLUMBING, unit: ItemUnit.UNIT, priceLow: 180, priceMedium: 320, priceHigh: 580, sortOrder: 41 },
  { name: "Instalação de torneira", category: ItemCategory.PLUMBING, unit: ItemUnit.UNIT, priceLow: 70, priceMedium: 130, priceHigh: 240, sortOrder: 42 },
  { name: "Troca de encanamento", category: ItemCategory.PLUMBING, unit: ItemUnit.M, priceLow: 55, priceMedium: 95, priceHigh: 180, sortOrder: 43 },
  { name: "Revisão hidráulica geral", category: ItemCategory.PLUMBING, unit: ItemUnit.SERVICE, priceLow: 700, priceMedium: 1300, priceHigh: 2500, sortOrder: 44 },
  { name: "Instalação de chuveiro", category: ItemCategory.PLUMBING, unit: ItemUnit.UNIT, priceLow: 120, priceMedium: 220, priceHigh: 400, sortOrder: 45 },
  { name: "Instalação de caixa d'água", category: ItemCategory.PLUMBING, unit: ItemUnit.SERVICE, priceLow: 300, priceMedium: 550, priceHigh: 1000, sortOrder: 46 },

  // ACABAMENTO
  { name: "Instalação de rodapé", category: ItemCategory.FINISHING, unit: ItemUnit.M, priceLow: 12, priceMedium: 22, priceHigh: 42, sortOrder: 50 },
  { name: "Instalação de bancada", category: ItemCategory.FINISHING, unit: ItemUnit.M, priceLow: 180, priceMedium: 350, priceHigh: 650, sortOrder: 51 },
  { name: "Ajuste de marcenaria", category: ItemCategory.FINISHING, unit: ItemUnit.HOUR, priceLow: 90, priceMedium: 160, priceHigh: 300, sortOrder: 52 },
  { name: "Instalação de vidros", category: ItemCategory.FINISHING, unit: ItemUnit.SQM, priceLow: 70, priceMedium: 140, priceHigh: 270, sortOrder: 53 },
  { name: "Serralheria", category: ItemCategory.FINISHING, unit: ItemUnit.SERVICE, priceLow: 110, priceMedium: 200, priceHigh: 380, sortOrder: 54 },

  // ESQUADRIAS
  { name: "Instalação de porta", category: ItemCategory.JOINERY, unit: ItemUnit.UNIT, priceLow: 140, priceMedium: 240, priceHigh: 420, sortOrder: 60 },
  { name: "Instalação de janela", category: ItemCategory.JOINERY, unit: ItemUnit.UNIT, priceLow: 140, priceMedium: 240, priceHigh: 420, sortOrder: 61 },
  { name: "Instalação de portão", category: ItemCategory.JOINERY, unit: ItemUnit.SERVICE, priceLow: 300, priceMedium: 550, priceHigh: 1000, sortOrder: 62 },

  // REVESTIMENTOS
  { name: "Assentamento de porcelanato", category: ItemCategory.TILING, unit: ItemUnit.SQM, priceLow: 45, priceMedium: 75, priceHigh: 130, sortOrder: 70 },
  { name: "Troca de piso laminado", category: ItemCategory.TILING, unit: ItemUnit.SQM, priceLow: 30, priceMedium: 52, priceHigh: 90, sortOrder: 71 },
  { name: "Assentamento de revestimento (parede)", category: ItemCategory.TILING, unit: ItemUnit.SQM, priceLow: 38, priceMedium: 62, priceHigh: 110, sortOrder: 72 },
  { name: "Rejuntamento", category: ItemCategory.TILING, unit: ItemUnit.SQM, priceLow: 12, priceMedium: 20, priceHigh: 38, sortOrder: 73 },

  // LIMPEZA
  { name: "Limpeza pós-obra", category: ItemCategory.CLEANING, unit: ItemUnit.SERVICE, priceLow: 280, priceMedium: 550, priceHigh: 1100, sortOrder: 80 },
  { name: "Limpeza de vidros", category: ItemCategory.CLEANING, unit: ItemUnit.SQM, priceLow: 8, priceMedium: 15, priceHigh: 30, sortOrder: 81 },

  // MARCENARIA
  { name: "Instalação de armário embutido", category: ItemCategory.CARPENTRY, unit: ItemUnit.UNIT, priceLow: 350, priceMedium: 650, priceHigh: 1300, sortOrder: 90 },
  { name: "Instalação de cozinha planejada", category: ItemCategory.CARPENTRY, unit: ItemUnit.SERVICE, priceLow: 500, priceMedium: 950, priceHigh: 1800, sortOrder: 91 },

  // OUTROS
  { name: "Mão de obra diária", category: ItemCategory.OTHERS, unit: ItemUnit.DAILY, priceLow: 180, priceMedium: 300, priceHigh: 550, sortOrder: 100 },
  { name: "Pequenos reparos", category: ItemCategory.OTHERS, unit: ItemUnit.DAILY, priceLow: 150, priceMedium: 250, priceHigh: 450, sortOrder: 101 },
  { name: "Mão de obra complementar", category: ItemCategory.OTHERS, unit: ItemUnit.DAILY, priceLow: 180, priceMedium: 300, priceHigh: 550, sortOrder: 102 },
];

async function seedReformItems() {
  console.log("🌱 Populando itens de reforma...");

  for (const item of reformItems) {
    await prisma.reformItem.upsert({
      where: { name: item.name } as any,
      update: {
        priceLow: item.priceLow,
        priceMedium: item.priceMedium,
        priceHigh: item.priceHigh,
        sortOrder: item.sortOrder,
      },
      create: {
        name: item.name,
        category: item.category,
        unit: item.unit,
        priceLow: item.priceLow,
        priceMedium: item.priceMedium,
        priceHigh: item.priceHigh,
        sortOrder: item.sortOrder,
        isActive: true,
      },
    });
  }

  console.log(`✅ ${reformItems.length} itens de reforma criados`);
}

seedReformItems()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
