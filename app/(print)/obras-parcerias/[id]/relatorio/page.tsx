import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planejamento", IN_PROGRESS: "Em Andamento", PAUSED: "Pausada",
  COMPLETED: "Concluída", CANCELLED: "Cancelada",
};
const PROV_STATUS: Record<string, string> = {
  PENDING: "Pendente", IN_PROGRESS: "Em Andamento", COMPLETED: "Concluído", CANCELED: "Cancelado",
};
const EXP_STATUS: Record<string, string> = { PENDING: "Pendente", PAID: "Pago", OVERDUE: "Vencido" };
const EXP_CATEGORY: Record<string, string> = {
  material: "Material", mao_de_obra: "Mão de Obra", transporte: "Transporte",
  ferramentas: "Ferramentas", alimentacao: "Alimentação", outros: "Outros",
};

export default async function RelatorioParceriaPage({ params }: { params: { id: string } }) {
  const [project, company] = await Promise.all([
    prisma.partnershipProject.findUnique({
      where: { id: params.id },
      include: {
        buyer: true,
        materials: { orderBy: { date: "asc" } },
        partnerProviders: {
          include: { serviceProvider: { select: { name: true, specialty: true } } },
          orderBy: { createdAt: "asc" },
        },
        partnerExpenses: { orderBy: { date: "asc" } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!project) notFound();

  const totalMaterials = project.materials.reduce((s, m) => s + Number(m.total), 0);
  const totalProviders = project.partnerProviders.reduce((s, p) => s + Number(p.agreedAmount ?? 0), 0);
  const totalPaidProviders = project.partnerProviders.reduce((s, p) => s + Number(p.paidAmount ?? 0), 0);
  const totalExpenses = project.partnerExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalCost = totalMaterials + totalProviders + totalExpenses;
  const budgeted = project.budgetedAmount ? Number(project.budgetedAmount) : null;
  const balance = budgeted != null ? budgeted - totalCost : null;

  const generatedAt = new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <title>Relatório — {project.name}</title>
        <style>{`
          @page { margin: 2cm 2cm; size: A4; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            color: #111;
            background: #fff;
            line-height: 1.5;
          }
          @media screen {
            body { max-width: 820px; margin: 30px auto; padding: 40px; background: #f5f5f5; }
            .page { background: #fff; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,.12); }
          }
          @media print { body { margin: 0; background: #fff; } .page { padding: 0; } .no-print { display: none; } }

          /* header */
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #EA580C; padding-bottom: 14px; margin-bottom: 20px; }
          .company-name { font-size: 14pt; font-weight: bold; color: #EA580C; }
          .company-sub { font-size: 8pt; color: #777; margin-top: 2px; }
          .doc-title { font-size: 13pt; font-weight: bold; text-align: right; color: #1a1a1a; }
          .doc-meta { font-size: 8pt; color: #666; text-align: right; margin-top: 4px; }

          /* project info */
          .info-box { background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; }
          .info-box h2 { font-size: 12pt; font-weight: bold; margin-bottom: 8px; color: #1a1a1a; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
          .info-row { display: flex; gap: 8px; font-size: 9pt; }
          .info-label { color: #666; min-width: 90px; flex-shrink: 0; }
          .info-value { color: #111; font-weight: 500; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 8pt; font-weight: 600; background: #d1fae5; color: #065f46; }

          /* summary cards */
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
          .summary-card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px 14px; }
          .summary-card .label { font-size: 8pt; color: #666; margin-bottom: 3px; }
          .summary-card .value { font-size: 12pt; font-weight: bold; color: #1a1a1a; }
          .summary-card.total { border-color: #EA580C; background: #fff7f5; }
          .summary-card.total .value { color: #EA580C; }
          .summary-card.balance-pos { border-color: #059669; background: #f0fdf4; }
          .summary-card.balance-pos .value { color: #059669; }
          .summary-card.balance-neg { border-color: #dc2626; background: #fef2f2; }
          .summary-card.balance-neg .value { color: #dc2626; }

          /* section */
          .section { margin-bottom: 24px; }
          .section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: .06em; color: #EA580C; border-bottom: 1px solid #f0c0a8; padding-bottom: 5px; margin-bottom: 10px; }
          .section-sub { font-size: 8.5pt; color: #555; margin-bottom: 10px; }

          /* table */
          table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
          thead tr { background: #f5f5f5; }
          th { text-align: left; padding: 6px 8px; font-weight: 600; color: #444; border-bottom: 1px solid #ddd; white-space: nowrap; }
          td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; color: #222; }
          tr:last-child td { border-bottom: none; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-muted { color: #777; }
          .chip { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 7.5pt; font-weight: 600; }
          .chip-green { background: #d1fae5; color: #065f46; }
          .chip-amber { background: #fef3c7; color: #92400e; }
          .chip-red { background: #fee2e2; color: #991b1b; }
          .chip-blue { background: #dbeafe; color: #1e40af; }
          .chip-gray { background: #f3f4f6; color: #4b5563; }

          /* totals row */
          .total-row td { font-weight: bold; background: #f9f9f9; border-top: 1px solid #ccc; }

          /* progress bar */
          .progress-wrap { margin-top: 6px; }
          .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
          .progress-fill { height: 100%; border-radius: 4px; }

          /* footer */
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 8pt; color: #999; text-align: center; }

          /* print button */
        `}</style>
      </head>
      <body>

        <div className="page">
          {/* Header */}
          <div className="header">
            <div>
              <div className="company-name">{company?.name || "ConTécnica"}</div>
              <div className="company-sub">Sistema de Gestão</div>
            </div>
            <div>
              <div className="doc-title">Relatório de Obra Parceria</div>
              <div className="doc-meta">Gerado em {generatedAt}</div>
            </div>
          </div>

          {/* Project Info */}
          <div className="info-box">
            <h2>{project.name}</h2>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Comprador</span>
                <span className="info-value">{project.buyer?.name || "—"}</span>
              </div>
              {project.buyer?.phone && (
                <div className="info-row">
                  <span className="info-label">Telefone</span>
                  <span className="info-value">{project.buyer.phone}</span>
                </div>
              )}
              {project.address && (
                <div className="info-row">
                  <span className="info-label">Endereço</span>
                  <span className="info-value">{project.address}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Status</span>
                <span className="info-value"><span className="badge">{STATUS_LABELS[project.status] ?? project.status}</span></span>
              </div>
              {project.startDate && (
                <div className="info-row">
                  <span className="info-label">Início</span>
                  <span className="info-value">{fmtDate(project.startDate)}</span>
                </div>
              )}
              {project.expectedEndDate && (
                <div className="info-row">
                  <span className="info-label">Previsão Término</span>
                  <span className="info-value">{fmtDate(project.expectedEndDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="section">
            <div className="section-title">Resumo Financeiro</div>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="label">Valor Previsto</div>
                <div className="value">{budgeted != null ? fmt(budgeted) : "—"}</div>
              </div>
              <div className="summary-card">
                <div className="label">Total Materiais</div>
                <div className="value">{fmt(totalMaterials)}</div>
              </div>
              <div className="summary-card">
                <div className="label">Total Prestadores</div>
                <div className="value">{fmt(totalProviders)}</div>
              </div>
              <div className="summary-card">
                <div className="label">Total Despesas</div>
                <div className="value">{fmt(totalExpenses)}</div>
              </div>
              <div className="summary-card total">
                <div className="label">Custo Total</div>
                <div className="value">{fmt(totalCost)}</div>
              </div>
              <div className={`summary-card ${balance == null ? "" : balance >= 0 ? "balance-pos" : "balance-neg"}`}>
                <div className="label">Saldo Restante</div>
                <div className="value">{balance != null ? fmt(balance) : "—"}</div>
              </div>
            </div>

            {budgeted != null && budgeted > 0 && (
              <div className="progress-wrap">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#555", marginBottom: "4px" }}>
                  <span>Uso do orçamento</span>
                  <span>{fmt(totalCost)} / {fmt(budgeted)} ({Math.round((totalCost / budgeted) * 100)}%)</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, (totalCost / budgeted) * 100)}%`,
                      background: (totalCost / budgeted) > 1 ? "#dc2626" : (totalCost / budgeted) > 0.8 ? "#f59e0b" : "#3b82f6",
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Materials */}
          {project.materials.length > 0 && (
            <div className="section">
              <div className="section-title">Materiais ({project.materials.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Fornecedor</th>
                    <th>Data</th>
                    <th className="text-right">Qtd</th>
                    <th className="text-right">Unit.</th>
                    <th className="text-right">Total</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {project.materials.map((m) => (
                    <tr key={m.id}>
                      <td className="font-bold">{m.description}</td>
                      <td className="text-muted">{m.supplier || "—"}</td>
                      <td className="text-muted">{fmtDate(m.date)}</td>
                      <td className="text-right">{Number(m.quantity).toLocaleString("pt-BR")}</td>
                      <td className="text-right">{fmt(Number(m.unitPrice))}</td>
                      <td className="text-right font-bold">{fmt(Number(m.total))}</td>
                      <td className="text-muted">{m.paymentMethod || "—"}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={5} className="text-right">Total Materiais</td>
                    <td className="text-right">{fmt(totalMaterials)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Providers */}
          {project.partnerProviders.length > 0 && (
            <div className="section">
              <div className="section-title">Prestadores de Serviço ({project.partnerProviders.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>Prestador</th>
                    <th>Serviço</th>
                    <th>Vencimento</th>
                    <th>Pgto</th>
                    <th className="text-right">Combinado</th>
                    <th className="text-right">Pago</th>
                    <th className="text-right">Saldo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {project.partnerProviders.map((p) => {
                    const agreed = Number(p.agreedAmount ?? 0);
                    const paid = Number(p.paidAmount ?? 0);
                    const saldo = agreed - paid;
                    const chipClass = p.status === "COMPLETED" ? "chip-green" : p.status === "IN_PROGRESS" ? "chip-blue" : p.status === "CANCELED" ? "chip-red" : "chip-amber";
                    return (
                      <tr key={p.id}>
                        <td className="font-bold">{p.serviceProvider?.name}</td>
                        <td>{p.serviceDescription}</td>
                        <td className="text-muted">{fmtDate(p.dueDate)}</td>
                        <td className="text-muted">{fmtDate(p.paymentDate)}</td>
                        <td className="text-right">{agreed ? fmt(agreed) : "—"}</td>
                        <td className="text-right">{paid ? fmt(paid) : "—"}</td>
                        <td className="text-right" style={{ color: saldo > 0 ? "#92400e" : saldo < 0 ? "#dc2626" : "#666" }}>
                          {agreed ? fmt(saldo) : "—"}
                        </td>
                        <td><span className={`chip ${chipClass}`}>{PROV_STATUS[p.status] ?? p.status}</span></td>
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td colSpan={4} className="text-right">Totais</td>
                    <td className="text-right">{fmt(totalProviders)}</td>
                    <td className="text-right">{fmt(totalPaidProviders)}</td>
                    <td className="text-right">{fmt(totalProviders - totalPaidProviders)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Expenses */}
          {project.partnerExpenses.length > 0 && (
            <div className="section">
              <div className="section-title">Despesas Diversas ({project.partnerExpenses.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Data</th>
                    <th>Pagamento</th>
                    <th className="text-right">Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {project.partnerExpenses.map((e) => {
                    const chipClass = e.status === "PAID" ? "chip-green" : e.status === "OVERDUE" ? "chip-red" : "chip-amber";
                    return (
                      <tr key={e.id}>
                        <td className="font-bold">{e.description}</td>
                        <td className="text-muted">{EXP_CATEGORY[e.category] ?? e.category}</td>
                        <td className="text-muted">{fmtDate(e.date)}</td>
                        <td className="text-muted">{e.paymentMethod || "—"}</td>
                        <td className="text-right font-bold">{fmt(Number(e.amount))}</td>
                        <td><span className={`chip ${chipClass}`}>{EXP_STATUS[e.status] ?? e.status}</span></td>
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td colSpan={4} className="text-right">Total Despesas</td>
                    <td className="text-right">{fmt(totalExpenses)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          {(project.description || project.notes) && (
            <div className="section">
              <div className="section-title">Observações</div>
              {project.description && <p style={{ fontSize: "9pt", marginBottom: "6px" }}><strong>Descrição:</strong> {project.description}</p>}
              {project.notes && <p style={{ fontSize: "9pt" }}><strong>Notas:</strong> {project.notes}</p>}
            </div>
          )}

          <div className="footer">
            Relatório gerado em {generatedAt} · {company?.name || "ConTécnica"} · Sistema de Gestão
          </div>
        </div>
      </body>
    </html>
  );
}
