import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/lib/api-validation";
import { supplierSchema } from "@/lib/validations";
import { getSessionFromRequest } from "@/lib/session";

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(request, supplierSchema);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.data as any;
  const { name, category, cpfCnpj, phone, email, notes } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: {
      name: name.trim(),
      category: category || null,
      cpfCnpj: cpfCnpj || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
    },
  });

  return NextResponse.json(supplier);
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.supplier.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
