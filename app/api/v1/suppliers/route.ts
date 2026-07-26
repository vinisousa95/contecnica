import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { supplierSchema } from "@/lib/validations";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { cpfCnpj: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(request, supplierSchema);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.data as any;
  const { name, category, cpfCnpj, phone, email, notes } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: name.trim(),
      category: category || null,
      cpfCnpj: cpfCnpj || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(supplier, { status: 201 });
}
