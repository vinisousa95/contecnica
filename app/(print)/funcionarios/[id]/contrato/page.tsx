import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const MONTHS_PT = [
  "janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro",
];

function fmtDateLong(d: Date | null | undefined): string {
  if (!d) return "___/___/______";
  const dt = new Date(d);
  return `${dt.getUTCDate()} de ${MONTHS_PT[dt.getUTCMonth()]} de ${dt.getUTCFullYear()}`;
}

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

const CSS = `
  @page { margin: 1cm 1.6cm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; color: #000; background: #fff; line-height: 1.35; }
  @media screen { body { max-width: 720px; margin: 20px auto; padding: 32px; } }
  @media print { body { margin: 0; } }
  h1 { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; text-align: center; letter-spacing: 0.03em; margin-bottom: 12px; }
  hr { border: none; border-top: 2px solid #000; margin: 0 auto 12px; }
  p { text-align: justify; text-indent: 1.2cm; margin-bottom: 5px; font-size: 10.5pt; }
  p.obs { text-align: justify; text-indent: 0; margin-bottom: 5px; }
  .sig-section { page-break-inside: avoid; break-inside: avoid; }
  .sig-date { text-align: right; margin: 16px 0 0; font-size: 10.5pt; text-indent: 0; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 28px; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1px solid #000; padding-top: 5px; font-size: 10pt; }
  .sig-label { font-size: 9pt; color: #444; margin-top: 1px; }
`;

export default async function ContratoFuncionarioPage({ params }: { params: { id: string } }) {
  const [employee, company] = await Promise.all([
    prisma.employee.findUnique({ where: { id: params.id } }),
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!employee) notFound();

  const companyName = company?.name || "CONTRATANTE";
  const companyCnpj = company?.cnpj || "";
  const companyStreet = [company?.street, company?.number].filter(Boolean).join(", ");
  const companyCity = company?.city || "São Paulo";
  const companyState = company?.state || "SP";
  const companyAddress = [companyStreet, company?.neighborhood, `${companyCity} - ${companyState}`].filter(Boolean).join(", ");

  const employeeName = employee.name;
  const employeeRg = employee.rg || "_____________";
  const employeeCpf = employee.cpf || "_____________";
  const employeeRole = employee.role || "_____________";
  const monthlyRate = employee.monthlyRate ? Number(employee.monthlyRate) : null;

  const startDate = employee.contractStartDate ? new Date(employee.contractStartDate) : new Date();
  const endDate = employee.contractEndDate ? new Date(employee.contractEndDate) : addDays(startDate, 90);
  const contractCity = (employee as any).contractCity || companyCity;

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <title>Contrato de Trabalho — {employeeName}</title>
        <style>{CSS}</style>
      </head>
      <body>
        <h1>Contrato Individual de Trabalho por Prazo Determinado ou Obra Certa</h1>
        <hr />

        <p>
          Por este instrumento particular que entre si fazem a empresa <strong>{companyName}</strong>
          {companyAddress ? `, com sede na ${companyAddress}` : ""}
          {companyCnpj ? `, CNPJ nº: ${companyCnpj},` : ","} neste ato denominada simplesmente
          Empregadora, e o Sr. <strong>{employeeName}</strong>, portador do RG: <strong>{employeeRg}</strong> e
          CPF: <strong>{employeeCpf}</strong>, doravante chamado simplesmente empregado, firmam o presente
          contrato de trabalho por prazo determinado em caráter transitório conforme alíneas a e b do
          parágrafo 2º do art. 443 da CLT, mediante as seguintes condições.
        </p>

        <p>
          1º) O empregado trabalhará para a empregadora exercendo a função
          de <strong>{employeeRole}</strong>, com a remuneração
          de R$ <strong>{monthlyRate ? fmtCurrency(monthlyRate) : "____________"}</strong> reais por mês.
        </p>

        <p>
          2º) Os locais de trabalho serão designados pela Empregadora.
        </p>

        <p>
          3º) Este contrato se dará início a partir de <strong>{fmtDateLong(startDate)}</strong>,
          vencendo-se em <strong>{fmtDateLong(endDate)}</strong>, podendo ser prorrogado por mais uma vez,
          obedecendo o prazo máximo de até dois anos conforme art. 446 da CLT.
        </p>

        <p>
          4º) O empregado se compromete a trabalhar em regime de compensação e de prorrogação de horas
          inclusive em período noturno, sempre que as necessidades assim o exigirem observadas as
          formalidades legais.
        </p>

        <p>
          5º) O presente contrato será regido nos termos do art. 481 da CLT. Em caso de rescisão antes
          de expirado o termo, será considerada a cláusula assecuratória de direito recíproco,
          aplicando-se por qualquer das partes os princípios que regem a rescisão dos contratos por
          prazo indeterminado.
        </p>

        <p className="obs">
          <strong>Observação:</strong> Este item poderá ser regido nos termos dos art. 479 e 480 se as
          partes acordarem, ou seja, uma rescisão sem justa causa implicará a obrigatoriedade de
          indenização de 50% sobre a remuneração a que o empregador teria direito até o término do
          contrato e, se a rescisão sem justa causa de iniciativa do empregado, esse será obrigado a
          indenizar o empregador dos prejuízos que desse feito lhe resultarem.
        </p>

        <p>
          6º) Em caso de rescisão antecipada por justa causa, deverá obedecer ao disposto no art. 482
          e 483 da CLT.
        </p>

        <p>
          E por estarem de pleno acordo, assinam as partes este contrato, em duas vias de igual teor.
        </p>

        <div className="sig-section">
        <p className="sig-date">{contractCity}, {fmtDateLong(startDate)}.</p>

        <div className="sig-grid">
          <div className="sig-block">
            <div className="sig-line">
              <p style={{ textIndent: 0, textAlign: "center", marginBottom: 2 }}>{companyName}</p>
              {companyCnpj && <p className="sig-label" style={{ textIndent: 0, textAlign: "center" }}>CNPJ: {companyCnpj}</p>}
              <p className="sig-label" style={{ textIndent: 0, textAlign: "center" }}>Empregadora</p>
            </div>
          </div>
          <div className="sig-block">
            <div className="sig-line">
              <p style={{ textIndent: 0, textAlign: "center", marginBottom: 2 }}>{employeeName}</p>
              <p className="sig-label" style={{ textIndent: 0, textAlign: "center" }}>RG: {employeeRg}</p>
              <p className="sig-label" style={{ textIndent: 0, textAlign: "center" }}>Empregado</p>
            </div>
          </div>
        </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: "window.onload=function(){window.print()}" }} />
      </body>
    </html>
  );
}
