import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: any) {
  if (!d) return "—";
  const iso = typeof d === "string" ? d : (d as Date).toISOString();
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Aguardando cliente",
  ACCEPTED: "Aceito",
  REJECTED: "Recusado",
};
const STATUS_CHIP: Record<string, string> = {
  PENDING_APPROVAL: "chip-amber",
  ACCEPTED: "chip-green",
  REJECTED: "chip-red",
};

export default async function ServicosExtrasRelatorioPage({ params }: { params: { id: string } }) {
  const [project, company] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { name: true, email: true, phone: true } },
        extraServices: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!project) notFound();

  const services = project.extraServices;
  const total = services.reduce((s, x) => s + Number(x.amount), 0);
  const totalAccepted = services.filter((x) => x.status === "ACCEPTED").reduce((s, x) => s + Number(x.amount), 0);
  const totalPaid = services.filter((x) => x.paidAt != null).reduce((s, x) => s + Number(x.amount), 0);
  const totalPending = services.filter((x) => x.status === "PENDING_APPROVAL").reduce((s, x) => s + Number(x.amount), 0);
  const countAccepted = services.filter((x) => x.status === "ACCEPTED").length;
  const countPending = services.filter((x) => x.status === "PENDING_APPROVAL").length;
  const countRejected = services.filter((x) => x.status === "REJECTED").length;

  const generatedAt = new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <title>Serviços Extras — {project.name}</title>
        <style>{`
          @page { margin: 2cm 2cm; size: A4; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; background: #fff; line-height: 1.5; }
          @media screen {
            body { max-width: 820px; margin: 30px auto; padding: 40px; background: #f5f5f5; }
            .page { background: #fff; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,.12); }
          }
          @media print { body { margin: 0; background: #fff; } .page { padding: 0; } .no-print { display: none; } }

          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #EA580C; padding-bottom: 14px; margin-bottom: 20px; }
          .company-name { font-size: 14pt; font-weight: bold; color: #EA580C; }
          .company-sub { font-size: 8pt; color: #777; margin-top: 2px; }
          .doc-title { font-size: 13pt; font-weight: bold; text-align: right; color: #1a1a1a; }
          .doc-meta { font-size: 8pt; color: #666; text-align: right; margin-top: 4px; }

          .info-box { background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; }
          .info-box h2 { font-size: 12pt; font-weight: bold; margin-bottom: 8px; color: #1a1a1a; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
          .info-row { display: flex; gap: 8px; font-size: 9pt; }
          .info-label { color: #666; min-width: 80px; flex-shrink: 0; }
          .info-value { color: #111; font-weight: 500; }

          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
          .summary-card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px 14px; }
          .summary-card .label { font-size: 8pt; color: #666; margin-bottom: 3px; }
          .summary-card .value { font-size: 12pt; font-weight: bold; color: #1a1a1a; }
          .summary-card .sub { font-size: 8pt; color: #999; margin-top: 2px; }
          .summary-card.highlight { border-color: #EA580C; background: #fff7f5; }
          .summary-card.highlight .value { color: #EA580C; }
          .summary-card.green { border-color: #059669; background: #f0fdf4; }
          .summary-card.green .value { color: #059669; }

          .section { margin-bottom: 24px; }
          .section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: .06em; color: #EA580C; border-bottom: 1px solid #f0c0a8; padding-bottom: 5px; margin-bottom: 10px; }

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
          .chip-gray { background: #f3f4f6; color: #4b5563; }
          .total-row td { font-weight: bold; background: #f9f9f9; border-top: 1px solid #ccc; }

          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 8pt; color: #999; text-align: center; }
          .print-btn { position: fixed; top: 20px; right: 20px; background: #EA580C; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-size: 10pt; font-weight: 600; cursor: pointer; z-index: 100; }
          .print-btn:hover { background: #c2410c; }
        `}</style>
      </head>
      <body>
        <button className="print-btn no-print" onClick="window.print()">Imprimir / Salvar PDF</button>

        <div className="page">
          {/* Header */}
          <div className="header">
            <div>
              <div className="company-name">{company?.name || "ConTécnica"}</div>
              <div className="company-sub">Sistema de Gestão</div>
            </div>
            <div>
              <div className="doc-title">Relatório de Serviços Extras</div>
              <div className="doc-meta">Gerado em {generatedAt}</div>
            </div>
          </div>

          {/* Project Info */}
          <div className="info-box">
            <h2>{project.name}</h2>
            <div className="info-grid">
              {project.client && (
                <div className="info-row">
                  <span className="info-label">Cliente</span>
                  <span className="info-value">{project.client.name}</span>
                </div>
              )}
              {project.client?.phone && (
                <div className="info-row">
                  <span className="info-label">Telefone</span>
                  <span className="info-value">{project.client.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="section">
            <div className="section-title">Resumo</div>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="label">Total de Serviços</div>
                <div className="value">{services.length}</div>
                <div className="sub">{countAccepted} aceitos · {countPending} aguardando · {countRejected} recusados</div>
              </div>
              <div className="summary-card highlight">
                <div className="label">Valor Total</div>
                <div className="value">{fmt(total)}</div>
              </div>
              <div className="summary-card green">
                <div className="label">Valor Aceito</div>
                <div className="value">{fmt(totalAccepted)}</div>
              </div>
              <div className="summary-card">
                <div className="label">Valor Pago</div>
                <div className="value">{fmt(totalPaid)}</div>
                {totalPending > 0 && <div className="sub">{fmt(totalPending)} aguardando</div>}
              </div>
            </div>
          </div>

          {/* Services Table */}
          <div className="section">
            <div className="section-title">Serviços ({services.length})</div>
            {services.length === 0 ? (
              <p style={{ fontSize: "9pt", color: "#888", textAlign: "center", padding: "20px 0" }}>Nenhum serviço extra cadastrado</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Serviço</th>
                    <th>Solicitante</th>
                    <th>Criado em</th>
                    <th>Aceito em</th>
                    <th>Pago em</th>
                    <th className="text-right">Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s, i) => (
                    <tr key={s.id}>
                      <td className="text-muted">{i + 1}</td>
                      <td>
                        <div className="font-bold">{s.name}</div>
                        {s.description && <div className="text-muted" style={{ fontSize: "7.5pt" }}>{s.description}</div>}
                      </td>
                      <td className="text-muted">{s.requestedBy || "—"}</td>
                      <td className="text-muted">{fmtDate(s.createdAt)}</td>
                      <td className="text-muted">{fmtDate(s.acceptedAt)}</td>
                      <td className="text-muted">{fmtDate(s.paidAt)}</td>
                      <td className="text-right font-bold">{fmt(Number(s.amount))}</td>
                      <td><span className={`chip ${STATUS_CHIP[s.status] ?? "chip-gray"}`}>{STATUS_LABEL[s.status] ?? s.status}</span></td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={6} className="text-right">Total</td>
                    <td className="text-right">{fmt(total)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="footer">
            Relatório gerado em {generatedAt} · {company?.name || "ConTécnica"} · Sistema de Gestão
          </div>
        </div>
      </body>
    </html>
  );
}
