import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const UNIT_LABELS: Record<string, string> = {
  UNIT: "Un", SQM: "m²", M: "m", ML: "ml",
  DAILY: "Diária", SERVICE: "Serviço", POINT: "Ponto", HOUR: "Hora",
};

const isEmbeddedItem = (l: string) => /^\d+\. .+ — \d/.test(l);
const isEmbeddedPayment = (l: string) => /^\d+ª .+: R\$/.test(l) || /^\d+ª .+R\$/.test(l);
const isSignatureLine = (l: string) => /^_{4,}/.test(l.trim());
const isBlank = (l: string) => l.trim() === "";
const isClause = (l: string) => /^CL[AÁ]USULA\s/i.test(l.trim());
const isSubItem = (l: string) => /^[a-z]\)\s/.test(l.trim());

export default async function PortalImprimirContrato({ params }: { params: { id: string } }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");

  const [contract, company] = await Promise.all([
    prisma.contract.findFirst({
      where: { id: params.id, clientId: session.clientId, status: { in: ["SENT", "SIGNED"] } },
      include: { client: true },
    }),
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!contract) notFound();

  const serviceItems: any[] = Array.isArray(contract.serviceItems) ? contract.serviceItems : [];
  const paymentSchedule: any[] = Array.isArray(contract.paymentSchedule) ? contract.paymentSchedule : [];
  const vars: any = typeof contract.variables === "object" ? contract.variables : {};
  const totalAmount = Number(contract.totalAmount);

  const companyName = company?.name || "";
  const companyCnpj = company?.cnpj || "";

  const bodyLines = contract.body.split("\n").filter(
    (l) => !isEmbeddedItem(l) && !isEmbeddedPayment(l) && !isSignatureLine(l)
  );

  const sigCity = vars.cidade || "";
  const sigDate = vars.data_assinatura || "";
  const responsavel = vars.responsavel_nome || "";
  const responsavelCpf = vars.responsavel_cpf || "";

  const CSS = `
    @page { margin: 2.5cm 2cm; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; background: #fff; line-height: 1.6; }
    @media screen { body { max-width: 800px; margin: 30px auto; padding: 40px; } }
    @media print { body { margin: 0; } }
    .page-header { text-align: center; margin-bottom: 32px; }
    .page-header h1 { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; }
    .page-header .num { font-size: 10pt; color: #444; margin-top: 6px; }
    .divider { border: none; border-top: 2px solid #000; margin: 0 auto 28px; }
    .body-text { margin-bottom: 28px; }
    .body-text p { margin-bottom: 8px; text-align: justify; font-size: 12pt; }
    .clause { font-weight: bold; text-transform: uppercase; margin-top: 20px; margin-bottom: 6px; }
    .subitem { padding-left: 24px; margin-bottom: 4px; }
    .section-heading { font-weight: bold; text-transform: uppercase; font-size: 11pt; letter-spacing: 0.04em; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 10px; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 11pt; }
    thead tr th { border: 1px solid #000; padding: 6px 10px; text-align: left; font-size: 10pt; font-weight: bold; background: #f0f0f0; }
    tbody tr td { border: 1px solid #000; padding: 6px 10px; }
    tbody tr:nth-child(even) td { background: #fafafa; }
    tfoot tr td { border: 1px solid #000; padding: 7px 10px; font-weight: bold; }
    .tr { text-align: right; } .tc { text-align: center; }
    .sig-section { margin-top: 48px; }
    .sig-date { text-align: right; margin-bottom: 40px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1px solid #000; padding-top: 8px; margin-top: 50px; font-size: 11pt; }
    .sig-label { font-weight: bold; }
    .sig-doc { font-size: 10pt; color: #333; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 8px; text-align: center; font-size: 8.5pt; color: #666; font-family: Arial, sans-serif; }
  `;

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <title>{contract.title}</title>
        <style>{CSS}</style>
      </head>
      <body>
        <div className="page-header">
          <h1>{contract.title}</h1>
          <p className="num">Nº {contract.number}</p>
        </div>
        <hr className="divider" />

        <div className="body-text">
          {bodyLines.map((line, idx) => {
            if (isBlank(line)) return <div key={idx} style={{ height: "8px" }} />;
            if (isClause(line)) return <p key={idx} className="clause">{line}</p>;
            if (isSubItem(line)) return <p key={idx} className="subitem">{line}</p>;
            return <p key={idx}>{line}</p>;
          })}
        </div>

        {serviceItems.length > 0 && (
          <>
            <div className="section-heading">Relação de Serviços</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "32px" }}>Nº</th>
                  <th>Descrição do Serviço</th>
                  <th className="tc" style={{ width: "55px" }}>Qtd</th>
                  <th className="tc" style={{ width: "55px" }}>Un</th>
                  <th className="tr" style={{ width: "110px" }}>Val. Unit.</th>
                  <th className="tr" style={{ width: "115px" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="tc" style={{ color: "#555" }}>{idx + 1}</td>
                    <td>{item.name}</td>
                    <td className="tc">{item.quantity}</td>
                    <td className="tc" style={{ color: "#555" }}>{UNIT_LABELS[item.unit] ?? item.unit}</td>
                    <td className="tr">{fmt(Number(item.unitPrice))}</td>
                    <td className="tr">{fmt(Number(item.subtotal))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="tr">VALOR TOTAL DOS SERVIÇOS</td>
                  <td className="tr">{fmt(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {paymentSchedule.length > 0 && (
          <>
            <div className="section-heading">Condições de Pagamento</div>
            <table>
              <thead>
                <tr>
                  <th className="tc" style={{ width: "70px" }}>Parcela</th>
                  <th>Descrição</th>
                  <th className="tc" style={{ width: "130px" }}>Vencimento</th>
                  <th className="tr" style={{ width: "130px" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {paymentSchedule.map((inst: any, idx: number) => (
                  <tr key={idx}>
                    <td className="tc">{inst.installment}ª</td>
                    <td>{inst.description || "—"}</td>
                    <td className="tc">{inst.dueDate}</td>
                    <td className="tr">{fmt(Number(inst.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="sig-section">
          {(sigCity || sigDate) && (
            <p className="sig-date">{[sigCity, sigDate].filter(Boolean).join(", ")}.</p>
          )}
          <div className="sig-grid">
            <div className="sig-block">
              <div className="sig-line">
                <p className="sig-label">CONTRATANTE</p>
                <p>{contract.client.name}</p>
                {contract.client.document && <p className="sig-doc">CPF/CNPJ: {contract.client.document}</p>}
              </div>
            </div>
            <div className="sig-block">
              <div className="sig-line">
                <p className="sig-label">CONTRATADA</p>
                {companyName && <p>{companyName}</p>}
                {companyCnpj && <p className="sig-doc">CNPJ: {companyCnpj}</p>}
              </div>
            </div>
          </div>
          {responsavel && (
            <div className="sig-grid" style={{ marginTop: "48px" }}>
              <div className="sig-block">
                <div className="sig-line">
                  <p className="sig-label">TESTEMUNHA</p>
                  <p>{responsavel}</p>
                  {responsavelCpf && <p className="sig-doc">CPF: {responsavelCpf}</p>}
                </div>
              </div>
              <div className="sig-block">
                <div className="sig-line">
                  <p className="sig-label">TESTEMUNHA</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="footer">
          Contrato Nº {contract.number}{companyName ? ` · ${companyName}` : ""} · Gerado pelo sistema Contécnica
        </div>

        <script dangerouslySetInnerHTML={{ __html: "window.onload=function(){window.print()}" }} />
      </body>
    </html>
  );
}
