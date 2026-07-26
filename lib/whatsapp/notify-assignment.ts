import { prisma } from "@/lib/prisma";
import { isWhatsappEnabled, sendWhatsappText } from "./evolution";
import {
  assignmentCreatedMessage,
  assignmentUpdatedMessage,
  assignmentCancelledMessage,
  type AssignmentMessageData,
} from "./messages";

export type NotifyKind = "ASSIGNMENT_CREATED" | "ASSIGNMENT_UPDATED" | "ASSIGNMENT_CANCELLED";

/**
 * Avisa o funcionário sobre um deslocamento, no WhatsApp.
 *
 * Regras de projeto:
 *   - NUNCA lança. Criar o deslocamento não pode falhar porque o WhatsApp caiu.
 *   - Todo desfecho vira uma linha em WhatsappLog (SENT / FAILED / SKIPPED),
 *     senão não há como saber se o funcionário foi avisado.
 *   - Respeita `Employee.whatsappEnabled`.
 */
export async function notifyAssignment(assignmentId: string, kind: NotifyKind): Promise<void> {
  try {
    const a = await prisma.workAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        employee: { select: { id: true, name: true, phone: true, whatsappEnabled: true } },
        vehicle: { select: { name: true, plate: true } },
        project: {
          select: {
            name: true, street: true, number: true,
            neighborhood: true, city: true, state: true,
          },
        },
      },
    });

    if (!a) return;

    const log = (status: string, extra: Record<string, unknown> = {}) =>
      prisma.whatsappLog
        .create({
          data: {
            kind, status,
            employeeId: a.employee.id,
            assignmentId: a.id,
            ...extra,
          },
        })
        .catch((e) => console.error("[whatsapp] falha ao gravar log:", e?.message));

    if (!isWhatsappEnabled()) {
      await log("SKIPPED", { error: "WhatsApp não configurado no servidor" });
      return;
    }
    if (!a.employee.whatsappEnabled) {
      await log("SKIPPED", { error: "Funcionário optou por não receber avisos" });
      return;
    }
    if (!a.employee.phone) {
      await log("SKIPPED", { error: "Funcionário sem telefone cadastrado" });
      return;
    }

    const data: AssignmentMessageData = {
      employeeName: a.employee.name,
      projectName: a.project.name,
      date: a.date,
      departureTime: a.departureTime,
      returnTime: a.returnTime,
      vehicleName: a.vehicle?.name ?? null,
      vehiclePlate: a.vehicle?.plate ?? null,
      notes: a.notes,
      address: a.project,
    };

    const text =
      kind === "ASSIGNMENT_CANCELLED" ? assignmentCancelledMessage(data)
      : kind === "ASSIGNMENT_UPDATED" ? assignmentUpdatedMessage(data)
      : assignmentCreatedMessage(data);

    const res = await sendWhatsappText(a.employee.phone, text);

    await log(res.ok ? "SENT" : "FAILED", {
      to: res.to ?? null,
      messageId: res.messageId ?? null,
      error: res.error ?? null,
    });

    if (!res.ok) console.error(`[whatsapp] envio falhou (${kind}):`, res.error);
  } catch (err: any) {
    // Rede de segurança: qualquer erro inesperado fica no log do servidor e o
    // fluxo que chamou segue normalmente.
    console.error("[whatsapp] erro inesperado ao notificar deslocamento:", err?.message);
  }
}
