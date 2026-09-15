import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { valorPorExtenso } from "@/lib/valor-extenso";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d: Date | null | undefined) {
  if (!d) return "";
  const iso = d.toISOString().slice(0, 10);
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

function fmtDataExtenso(d: Date | null | undefined) {
  if (!d) return "";
  const iso = d.toISOString().slice(0, 10);
  const [y, m, day] = iso.split("-");
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${day} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  PIX: "PIX",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  dinheiro: "Dinheiro",
  transfer: "Transferência bancária",
  boleto: "Boleto",
};

export default async function ImprimirReciboPage(props: {
  params: Promise<{ revenueId: string }>;
}) {
  const params = await props.params;
  const [revenue, company] = await Promise.all([
    prisma.revenue.findUnique({
      where: { id: params.revenueId },
      include: {
        client: true,
        project: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!revenue) notFound();

  const amount = Number(revenue.amount);
  const extenso = valorPorExtenso(amount);

  // A quem se refere: cliente da receita, senão o cliente da obra não está
  // ligado aqui — usa o nome informado. Recibo é emitido PELA empresa.
  const pagador = revenue.client?.name ?? "";
  const pagadorDoc = revenue.client?.document ?? "";

  const companyName = company?.name || "";
  const companyCnpj = company?.cnpj || "";
  const companyCity = company?.city || "";
  const signatureUrl = company?.signatureUrl || "";
  const logoUrl = company?.logoUrl || "";

  // Data do recibo: data de recebimento, senão a de vencimento.
  const dataRecibo = revenue.receivedDate ?? revenue.dueDate;

  const formaPagamento = revenue.paymentMethod
    ? PAYMENT_LABELS[revenue.paymentMethod] ?? revenue.paymentMethod
    : "";

  const numero = revenue.id.slice(-8).toUpperCase();

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <title>Recibo {numero}</title>
        <style>{`
          @page { margin: 2.5cm 2cm; size: A4; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt; color: #000; background: #fff; line-height: 1.6;
          }
          @media screen { body { max-width: 800px; margin: 30px auto; padding: 40px; } }
          @media print { body { margin: 0; } }

          .recibo-box { border: 2px solid #000; padding: 32px 36px; }

          .top {
            display: flex; justify-content: space-between; align-items: flex-start;
            margin-bottom: 24px;
          }
          .company-block .logo { max-height: 64px; max-width: 240px; object-fit: contain; margin-bottom: 8px; display: block; }
          .company-name { font-size: 13pt; font-weight: bold; }
          .company-info { font-size: 9.5pt; color: #444; margin-top: 2px; }
          .valor-badge {
            border: 1.5px solid #000; padding: 8px 16px; text-align: center;
            min-width: 170px;
          }
          .valor-badge .rot { font-size: 8.5pt; letter-spacing: 0.1em; color: #555; text-transform: uppercase; }
          .valor-badge .val { font-size: 16pt; font-weight: bold; margin-top: 2px; }

          h1.titulo {
            text-align: center; font-size: 15pt; letter-spacing: 0.25em;
            text-transform: uppercase; margin: 8px 0 24px;
          }

          .corpo p { text-align: justify; margin-bottom: 14px; font-size: 12.5pt; }
          .corpo .destaque { font-weight: bold; }
          .extenso { font-style: italic; }

          .detalhes {
            border-top: 1px solid #ccc; border-bottom: 1px solid #ccc;
            padding: 12px 0; margin: 20px 0; font-size: 11pt;
          }
          .detalhes .linha { display: flex; margin-bottom: 4px; }
          .detalhes .rot { width: 160px; color: #555; }
          .detalhes .dado { flex: 1; font-weight: bold; }

          .local-data { text-align: right; margin: 28px 0 8px; font-size: 12pt; }

          .assinatura { margin-top: 20px; text-align: center; }
          .assinatura img { max-height: 70px; object-fit: contain; margin-bottom: -6px; }
          .assinatura .linha-sig {
            border-top: 1px solid #000; width: 320px; margin: 0 auto; padding-top: 6px;
          }
          .assinatura .nome { font-weight: bold; font-size: 11pt; }
          .assinatura .doc { font-size: 10pt; color: #333; }

          .footer {
            margin-top: 28px; text-align: center; font-size: 8.5pt; color: #666;
            font-family: Arial, sans-serif;
          }
          .no-print { text-align: center; margin-bottom: 16px; }
          @media print { .no-print { display: none; } }
          .btn-print {
            font-family: Arial, sans-serif; font-size: 11pt; padding: 8px 20px;
            background: #EA580C; color: #fff; border: none; border-radius: 8px; cursor: pointer;
          }
        `}</style>
      </head>
      <body>
        <div className="no-print">
          <button className="btn-print" id="print-btn">Imprimir / Salvar PDF</button>
        </div>

        <div className="recibo-box">
          {/* Cabeçalho: empresa + valor */}
          <div className="top">
            <div className="company-block">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="logo" />
              )}
              <div className="company-name">{companyName || "—"}</div>
              {companyCnpj && <div className="company-info">CNPJ: {companyCnpj}</div>}
              {(company?.street || company?.city) && (
                <div className="company-info">
                  {[company?.street, company?.number].filter(Boolean).join(", ")}
                  {company?.city ? ` — ${company.city}${company?.state ? "/" + company.state : ""}` : ""}
                </div>
              )}
              {company?.phone && <div className="company-info">Tel: {company.phone}</div>}
            </div>
            <div className="valor-badge">
              <div className="rot">Valor</div>
              <div className="val">{fmt(amount)}</div>
            </div>
          </div>

          <h1 className="titulo">Recibo</h1>

          {/* Corpo */}
          <div className="corpo">
            <p>
              Recebi{companyName ? <> (<span className="destaque">{companyName}</span>)</> : ""} de{" "}
              <span className="destaque">{pagador || "—"}</span>
              {pagadorDoc ? <>, portador(a) do CPF/CNPJ <span className="destaque">{pagadorDoc}</span>,</> : ","}{" "}
              a importância de <span className="destaque">{fmt(amount)}</span>{" "}
              (<span className="extenso">{extenso}</span>), referente a{" "}
              <span className="destaque">{revenue.description}</span>
              {revenue.project ? <> da obra <span className="destaque">{revenue.project.name}</span></> : ""}.
            </p>
            <p>Para maior clareza, firmo o presente recibo, dando plena e geral quitação sobre o valor acima descrito.</p>
          </div>

          {/* Detalhes */}
          <div className="detalhes">
            <div className="linha">
              <div className="rot">Recibo nº</div>
              <div className="dado">{numero}</div>
            </div>
            {revenue.category?.name && (
              <div className="linha">
                <div className="rot">Categoria</div>
                <div className="dado">{revenue.category.name}</div>
              </div>
            )}
            {formaPagamento && (
              <div className="linha">
                <div className="rot">Forma de pagamento</div>
                <div className="dado">{formaPagamento}</div>
              </div>
            )}
            <div className="linha">
              <div className="rot">Data</div>
              <div className="dado">{fmtData(dataRecibo)}</div>
            </div>
          </div>

          {/* Local e data */}
          <p className="local-data">
            {[companyCity, fmtDataExtenso(dataRecibo)].filter(Boolean).join(", ")}.
          </p>

          {/* Assinatura */}
          <div className="assinatura">
            {signatureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureUrl} alt="Assinatura" />
            )}
            <div className="linha-sig">
              <div className="nome">{companyName || ""}</div>
              {companyCnpj && <div className="doc">CNPJ: {companyCnpj}</div>}
            </div>
          </div>
        </div>

        <div className="footer">
          Recibo nº {numero}{companyName ? ` · ${companyName}` : ""} · Gerado pelo sistema Contécnica
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.getElementById('print-btn').addEventListener('click',function(){window.print()});window.onload=function(){setTimeout(function(){window.print()},300)}",
          }}
        />
      </body>
    </html>
  );
}
