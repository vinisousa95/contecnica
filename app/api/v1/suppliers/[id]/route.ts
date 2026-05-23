import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.supplier.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
