import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function formatCurrencyBR(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("pt-BR");
}

const UNIT_LABELS: Record<string, string> = {
  UNIT: "Un", SQM: "m²", M: "m", ML: "ml", DAILY: "Diária", SERVICE: "Serviço", POINT: "Ponto", HOUR: "Hora",
};

export default async function ImprimirContratoPage({ params }: { params: { id: string } }) {
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!contract) notFound();

  const serviceItems: any[] = Array.isArray(contract.serviceItems) ? contract.serviceItems : [];
  const paymentSchedule: any[] = Array.isArray(contract.paymentSchedule) ? contract.paymentSchedule : [];
  const totalAmount = Number(contract.totalAmount);

  return (
    <html lang="pt-BR">
      <head>
        <title>{contract.title} — {contract.number}</title>
        <style>{`
          @page { margin: 2.5cm 2cm; size: A4; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; line-height: 1.6; background: #fff; }
          .container { max-width: 800px; margin: 0 auto; padding: 0; }
          .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #000; padding-bottom: 16px; }
          .header h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; }
          .header p { font-size: 10pt; color: #444; margin-top: 4px; }
          .number { font-size: 10pt; color: #666; margin-top: 8px; }
          .body-text { white-space: pre-wrap; font-size: 12pt; line-height: 1.8; text-align: justify; margin-bottom: 32px; }
          .section-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 24px 0 12px; border-bottom: 1px solid #999; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11pt; }
          th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 10pt; font-weight: bold; }
          td { border: 1px solid #ddd; padding: 6px 10px; vertical-align: top; }
          .text-right { text-align: right; }
          .total-row td { font-weight: bold; background: #f9f9f9; }
          .signatures { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .sig-block { border-top: 1px solid #000; padding-top: 8px; text-align: center; font-size: 11pt; }
          .footer { margin-top: 40px; font-size: 9pt; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; }
          @media print { button { display: none !important; } }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            <h1>{contract.title}</h1>
            <p className="number">Nº {contract.number}</p>
          </div>

          <div className="body-text">{contract.body}</div>

          {serviceItems.length > 0 && (
            <>
              <div className="section-title">Descrição dos Serviços</div>
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th className="text-right" style={{ width: "60px" }}>Qtd</th>
                    <th style={{ width: "60px" }}>Un</th>
                    <th className="text-right" style={{ width: "100px" }}>Val. Unit.</th>
                    <th className="text-right" style={{ width: "110px" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceItems.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td>{UNIT_LABELS[item.unit] ?? item.unit}</td>
                      <td className="text-right">{formatCurrencyBR(Number(item.unitPrice))}</td>
                      <td className="text-right">{formatCurrencyBR(Number(item.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={4} className="text-right">TOTAL</td>
                    <td className="text-right">{formatCurrencyBR(totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}

          {paymentSchedule.length > 0 && (
            <>
              <div className="section-title">Condições de Pagamento</div>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>Parcela</th>
                    <th>Descrição</th>
                    <th style={{ width: "120px" }}>Vencimento</th>
                    <th className="text-right" style={{ width: "120px" }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentSchedule.map((inst: any, idx: number) => (
                    <tr key={idx}>
                      <td className="text-right">{inst.installment}ª</td>
                      <td>{inst.description || "—"}</td>
                      <td>{inst.dueDate}</td>
                      <td className="text-right">{formatCurrencyBR(Number(inst.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="signatures">
            <div className="sig-block">
              <p>CONTRATANTE</p>
              <p style={{ marginTop: "4px", fontSize: "10pt", color: "#444" }}>{contract.client.name}</p>
            </div>
            <div className="sig-block">
              <p>CONTRATADA</p>
            </div>
          </div>

          <div className="footer">
            Contrato gerado em {formatDateBR(new Date())} — Nº {contract.number}
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: "window.onload = function() { window.print(); }" }} />
      </body>
    </html>
  );
}
