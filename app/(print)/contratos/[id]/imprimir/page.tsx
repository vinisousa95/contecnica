import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function fmt(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const UNIT_LABELS: Record<string, string> = {
  UNIT: "Un", SQM: "m²", M: "m", ML: "ml",
  DAILY: "Diária", SERVICE: "Serviço", POINT: "Ponto", HOUR: "Hora",
};

function renderBodyLine(line: string, idx: number) {
  const isClause = /^CL[AÁ]USULA\s/i.test(line);
  const isSubItem = /^[a-z]\)\s/.test(line);
  const isSignatureLine = /^_{5,}/.test(line);
  const isEmpty = line.trim() === "";

  if (isEmpty) return <div key={idx} style={{ height: "10px" }} />;
  if (isSignatureLine) return null; // rendered separately
  if (line.startsWith("Por estarem") || line.startsWith("{{cidade}}") || /^\w+,\s\d/.test(line))
    return null; // rendered separately

  if (isClause) {
    return (
      <p key={idx} style={{
        fontWeight: "bold", fontSize: "11pt", marginTop: "18px", marginBottom: "4px",
        color: "#1a1a2e", textTransform: "uppercase", letterSpacing: "0.03em",
        borderBottom: "1px solid #e5e5e5", paddingBottom: "3px",
      }}>
        {line}
      </p>
    );
  }
  if (isSubItem) {
    return (
      <p key={idx} style={{ margin: "2px 0", paddingLeft: "16px", fontSize: "11pt", color: "#333" }}>
        {line}
      </p>
    );
  }
  return (
    <p key={idx} style={{ margin: "4px 0", fontSize: "11pt", lineHeight: "1.7", textAlign: "justify", color: "#222" }}>
      {line}
    </p>
  );
}

export default async function ImprimirContratoPage({ params }: { params: { id: string } }) {
  const [contract, company] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        project: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!contract) notFound();

  const serviceItems: any[] = Array.isArray(contract.serviceItems) ? contract.serviceItems : [];
  const paymentSchedule: any[] = Array.isArray(contract.paymentSchedule) ? contract.paymentSchedule : [];
  const vars: any = typeof contract.variables === "object" ? contract.variables : {};
  const totalAmount = Number(contract.totalAmount);

  const bodyLines = contract.body.split("\n");
  const sigDate = vars.data_assinatura || "";
  const sigCity = vars.cidade || "";
  const responsavel = vars.responsavel_nome || "";
  const responsavelCpf = vars.responsavel_cpf || "";

  const companyName = company?.name || "CONTRATADA";
  const companyCnpj = company?.cnpj || "";

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <title>{contract.title} — Nº {contract.number}</title>
        <style>{`
          @page { margin: 1.8cm 1.5cm; size: A4; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; color: #222; background: #fff; }
          @media print { .no-print { display: none !important; } body { margin: 0; } }
          @media screen { body { max-width: 820px; margin: 20px auto; padding: 20px; box-shadow: 0 0 20px rgba(0,0,0,0.1); } }
        `}</style>
      </head>
      <body>

        {/* ── HEADER ───────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          color: "#fff", borderRadius: "6px 6px 0 0", overflow: "hidden",
          marginBottom: "0",
        }}>
          <div style={{
            background: "#EA580C", height: "5px",
          }} />
          <div style={{ padding: "20px 28px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "20pt", fontWeight: "900", fontFamily: "Arial, sans-serif", letterSpacing: "-0.5px" }}>
                {companyName}
              </div>
              {companyCnpj && (
                <div style={{ fontSize: "9pt", color: "#94a3b8", marginTop: "2px" }}>CNPJ: {companyCnpj}</div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "9pt", color: "#94a3b8", fontFamily: "Arial, sans-serif" }}>CONTRATO Nº</div>
              <div style={{ fontSize: "16pt", fontWeight: "700", color: "#EA580C", fontFamily: "Arial, sans-serif" }}>
                {contract.number}
              </div>
            </div>
          </div>
        </div>

        {/* ── TITLE ─────────────────────────────────────────── */}
        <div style={{
          background: "#f8f9fa", border: "1px solid #e2e8f0", borderTop: "none",
          padding: "14px 28px", textAlign: "center", marginBottom: "20px",
          borderRadius: "0 0 6px 6px",
        }}>
          <div style={{
            fontSize: "13pt", fontWeight: "bold", textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#1a1a2e",
          }}>
            {contract.title}
          </div>
          {contract.project && (
            <div style={{ fontSize: "9pt", color: "#64748b", marginTop: "3px", fontFamily: "Arial, sans-serif" }}>
              Referente à Obra: {contract.project.name}
            </div>
          )}
        </div>

        {/* ── PARTIES ───────────────────────────────────────── */}
        <table style={{
          width: "100%", borderCollapse: "collapse", marginBottom: "24px",
          border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden",
        }}>
          <thead>
            <tr style={{ background: "#EA580C" }}>
              <th style={{ padding: "8px 14px", color: "#fff", fontSize: "9pt", fontFamily: "Arial, sans-serif", textAlign: "left", width: "50%" }}>
                CONTRATANTE
              </th>
              <th style={{ padding: "8px 14px", color: "#fff", fontSize: "9pt", fontFamily: "Arial, sans-serif", textAlign: "left", width: "50%", borderLeft: "1px solid rgba(255,255,255,0.3)" }}>
                CONTRATADA
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#fff" }}>
              <td style={{ padding: "12px 14px", verticalAlign: "top", borderRight: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: "bold", fontSize: "11pt" }}>{contract.client.name}</div>
                {contract.client.document && (
                  <div style={{ fontSize: "9.5pt", color: "#555", marginTop: "3px" }}>CPF/CNPJ: {contract.client.document}</div>
                )}
                {contract.client.street && (
                  <div style={{ fontSize: "9pt", color: "#666", marginTop: "2px" }}>
                    {[contract.client.street, contract.client.number, contract.client.neighborhood, contract.client.city, contract.client.state].filter(Boolean).join(", ")}
                  </div>
                )}
                {contract.client.phone && (
                  <div style={{ fontSize: "9pt", color: "#666" }}>Tel: {contract.client.phone}</div>
                )}
              </td>
              <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                <div style={{ fontWeight: "bold", fontSize: "11pt" }}>{companyName}</div>
                {companyCnpj && (
                  <div style={{ fontSize: "9.5pt", color: "#555", marginTop: "3px" }}>CNPJ: {companyCnpj}</div>
                )}
                {company?.street && (
                  <div style={{ fontSize: "9pt", color: "#666", marginTop: "2px" }}>
                    {[company.street, company.number, company.neighborhood, company.city, company.state].filter(Boolean).join(", ")}
                  </div>
                )}
                {company?.phone && (
                  <div style={{ fontSize: "9pt", color: "#666" }}>Tel: {company.phone}</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── CONTRACT BODY ─────────────────────────────────── */}
        <div style={{ marginBottom: "24px" }}>
          {bodyLines.map((line, idx) => renderBodyLine(line, idx))}
        </div>

        {/* ── SERVICE ITEMS TABLE ───────────────────────────── */}
        {serviceItems.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{
              background: "#EA580C", color: "#fff", padding: "8px 14px",
              fontSize: "10pt", fontWeight: "bold", fontFamily: "Arial, sans-serif",
              textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: "4px 4px 0 0",
            }}>
              Relação de Serviços
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", borderTop: "none" }}>
              <thead>
                <tr style={{ background: "#fff3ed" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e" }}>
                    Nº
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e" }}>
                    Descrição do Serviço
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e", width: "60px" }}>
                    Qtd
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e", width: "55px" }}>
                    Un
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e", width: "105px" }}>
                    Valor Unit.
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e", width: "115px" }}>
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.map((item: any, idx: number) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "7px 12px", fontSize: "9.5pt", color: "#888", borderBottom: "1px solid #f0f0f0", fontFamily: "Arial, sans-serif" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: "10pt", borderBottom: "1px solid #f0f0f0" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: "10pt", textAlign: "center", borderBottom: "1px solid #f0f0f0", fontFamily: "Arial, sans-serif" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: "9.5pt", textAlign: "center", color: "#666", borderBottom: "1px solid #f0f0f0", fontFamily: "Arial, sans-serif" }}>
                      {UNIT_LABELS[item.unit] ?? item.unit}
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: "10pt", textAlign: "right", borderBottom: "1px solid #f0f0f0", fontFamily: "Arial, sans-serif" }}>
                      {fmt(Number(item.unitPrice))}
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: "10pt", textAlign: "right", fontWeight: "600", borderBottom: "1px solid #f0f0f0", fontFamily: "Arial, sans-serif" }}>
                      {fmt(Number(item.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#1a1a2e" }}>
                  <td colSpan={5} style={{ padding: "9px 12px", textAlign: "right", fontSize: "10pt", fontWeight: "bold", color: "#fff", fontFamily: "Arial, sans-serif" }}>
                    VALOR TOTAL DOS SERVIÇOS
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "12pt", fontWeight: "bold", color: "#EA580C", fontFamily: "Arial, sans-serif" }}>
                    {fmt(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── PAYMENT SCHEDULE TABLE ────────────────────────── */}
        {paymentSchedule.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{
              background: "#1a1a2e", color: "#fff", padding: "8px 14px",
              fontSize: "10pt", fontWeight: "bold", fontFamily: "Arial, sans-serif",
              textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: "4px 4px 0 0",
            }}>
              Condições de Pagamento
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", borderTop: "none" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e", width: "70px" }}>
                    Parcela
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e" }}>
                    Descrição
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e", width: "130px" }}>
                    Vencimento
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "9pt", fontFamily: "Arial, sans-serif", borderBottom: "1px solid #e2e8f0", color: "#1a1a2e", width: "130px" }}>
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentSchedule.map((inst: any, idx: number) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "7px 12px", fontSize: "10pt", textAlign: "center", borderBottom: "1px solid #f0f0f0", fontFamily: "Arial, sans-serif", color: "#EA580C", fontWeight: "600" }}>
                      {inst.installment}ª
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: "10pt", borderBottom: "1px solid #f0f0f0" }}>
                      {inst.description || "—"}
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: "10pt", textAlign: "center", borderBottom: "1px solid #f0f0f0", fontFamily: "Arial, sans-serif" }}>
                      {inst.dueDate}
                    </td>
                    <td style={{ padding: "7px 12px", fontSize: "10pt", textAlign: "right", fontWeight: "600", borderBottom: "1px solid #f0f0f0", fontFamily: "Arial, sans-serif" }}>
                      {fmt(Number(inst.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── SIGNATURE BLOCK ───────────────────────────────── */}
        <div style={{
          borderTop: "2px solid #e2e8f0", paddingTop: "28px", marginTop: "12px",
        }}>
          {sigCity && sigDate && (
            <p style={{ textAlign: "center", fontSize: "11pt", marginBottom: "36px", color: "#333" }}>
              {sigCity}, {sigDate}.
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
            {/* CONTRATANTE */}
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1.5px solid #1a1a2e", paddingTop: "10px" }}>
                <div style={{ fontWeight: "bold", fontSize: "10.5pt", color: "#1a1a2e" }}>CONTRATANTE</div>
                <div style={{ fontSize: "10.5pt", marginTop: "4px" }}>{contract.client.name}</div>
                {contract.client.document && (
                  <div style={{ fontSize: "9pt", color: "#666" }}>CPF/CNPJ: {contract.client.document}</div>
                )}
              </div>
            </div>
            {/* CONTRATADA */}
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1.5px solid #1a1a2e", paddingTop: "10px" }}>
                <div style={{ fontWeight: "bold", fontSize: "10.5pt", color: "#1a1a2e" }}>CONTRATADA</div>
                <div style={{ fontSize: "10.5pt", marginTop: "4px" }}>{companyName}</div>
                {companyCnpj && (
                  <div style={{ fontSize: "9pt", color: "#666" }}>CNPJ: {companyCnpj}</div>
                )}
              </div>
            </div>
          </div>

          {/* TESTEMUNHA */}
          {responsavel && (
            <div style={{ marginTop: "36px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1.5px solid #aaa", paddingTop: "10px" }}>
                  <div style={{ fontSize: "9.5pt", color: "#555" }}>TESTEMUNHA</div>
                  <div style={{ fontSize: "10pt", marginTop: "3px" }}>{responsavel}</div>
                  {responsavelCpf && (
                    <div style={{ fontSize: "9pt", color: "#666" }}>CPF: {responsavelCpf}</div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1.5px solid #aaa", paddingTop: "10px" }}>
                  <div style={{ fontSize: "9.5pt", color: "#555" }}>TESTEMUNHA</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <div style={{
          marginTop: "28px", borderTop: "1px solid #e2e8f0", paddingTop: "10px",
          textAlign: "center", fontSize: "8pt", color: "#aaa", fontFamily: "Arial, sans-serif",
        }}>
          {companyName} · Contrato Nº {contract.number} · Documento gerado pelo sistema Contécnica
        </div>

        <script dangerouslySetInnerHTML={{ __html: "window.onload = function() { window.print(); }" }} />
      </body>
    </html>
  );
}
