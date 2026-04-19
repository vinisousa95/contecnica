"use client";

import { useEffect } from "react";

// ── Constants ─────────────────────────────────────────────────
const TIER_LABELS: Record<string, string> = {
  HIGH: "Preço Alto",
  MEDIUM: "Preço Médio",
  LOW: "Preço Baixo",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  UNDER_REVIEW: "Em Revisão",
  SENT: "Enviado",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  CANCELLED: "Cancelado",
};

const CATEGORY_LABELS: Record<string, string> = {
  DEMOLITION: "Demolição",
  PAINTING: "Pintura",
  MASONRY: "Alvenaria",
  ELECTRICAL: "Elétrica",
  PLUMBING: "Hidráulica",
  FINISHING: "Acabamento",
  CLEANING: "Limpeza",
  JOINERY: "Marcenaria",
  TILING: "Revestimentos",
  CARPENTRY: "Carpintaria",
  OTHERS: "Outros",
};

const UNIT_LABELS: Record<string, string> = {
  UNIT: "un",
  SQM: "m²",
  M: "m",
  DAILY: "diária",
  SERVICE: "serviço",
  POINT: "ponto",
  HOUR: "hora",
};

// ── Helpers ───────────────────────────────────────────────────
function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function fmtDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function fmtQty(value: number) {
  return value % 1 === 0 ? value.toString() : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

// ── Component ─────────────────────────────────────────────────
export function PrintView({ budget }: { budget: any }) {
  useEffect(() => {
    // Small delay so styles render before print dialog opens
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, []);

  const itemsByCategory = (budget.items ?? []).reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.reformItem?.category ?? "OTHERS";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const itemsTotal = (budget.items ?? []).reduce((s: number, i: any) => s + i.subtotal, 0);
  const extrasTotal = (budget.extraItems ?? []).reduce((s: number, e: any) => s + e.subtotal, 0);

  const client = budget.client;
  const addressParts = [
    budget.street && `${budget.street}${budget.number ? `, ${budget.number}` : ""}`,
    budget.complement,
    budget.neighborhood,
    budget.city && budget.state ? `${budget.city} - ${budget.state}` : (budget.city || budget.state),
    budget.zipCode && `CEP ${budget.zipCode}`,
  ].filter(Boolean);

  const clientAddressParts = [
    client.street && `${client.street}${client.number ? `, ${client.number}` : ""}`,
    client.complement,
    client.neighborhood,
    client.city && client.state ? `${client.city} - ${client.state}` : (client.city || client.state),
  ].filter(Boolean);

  return (
    <>
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: white; }

        .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm 14mm 18mm 14mm; }

        /* Header */
        .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 3px solid #EA580C; margin-bottom: 16px; }
        .logo-block { display: flex; align-items: center; gap: 10px; }
        .logo-icon { width: 48px; height: 48px; background: #EA580C; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: white; flex-shrink: 0; }
        .logo-text h1 { font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
        .logo-text p { font-size: 9px; color: #6b7280; margin-top: 2px; }
        .company-info { text-align: right; color: #6b7280; font-size: 9.5px; line-height: 1.7; }
        .company-info strong { color: #111827; font-size: 10.5px; font-weight: 700; display: block; margin-bottom: 2px; }

        /* Budget meta bar */
        .budget-meta { background: #1F2937; color: white; border-radius: 6px; padding: 11px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        .budget-meta-left h2 { font-size: 14px; font-weight: 700; color: white; }
        .budget-meta-left .code { font-size: 10px; color: #9ca3af; margin-top: 3px; font-family: monospace; letter-spacing: 0.5px; }
        .budget-meta-right { text-align: right; font-size: 9.5px; color: #d1d5db; line-height: 1.8; }
        .status-badge { display: inline-block; background: #EA580C; color: white; font-weight: 700; font-size: 8.5px; padding: 2px 9px; border-radius: 99px; margin-top: 5px; letter-spacing: 0.3px; }

        /* Info grid */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .info-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
        .info-box h3 { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 7px; }
        .info-row { display: flex; gap: 6px; margin-bottom: 3px; font-size: 10px; }
        .info-label { color: #6b7280; min-width: 62px; flex-shrink: 0; }
        .info-value { color: #111827; font-weight: 500; }

        /* Section title */
        .section-title { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #374151; border-bottom: 1.5px solid #d1d5db; padding-bottom: 5px; margin-bottom: 8px; margin-top: 16px; }
        .section-title span { color: #EA580C; }

        /* Items table */
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; padding: 6px 8px; text-align: left; border-bottom: 1.5px solid #e5e7eb; background: #f9fafb; }
        th.right { text-align: right; }
        td { padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; color: #374151; }
        td.right { text-align: right; }
        tr:last-child td { border-bottom: none; }

        /* Category row */
        .cat-row td { background: #f3f4f6; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #374151; padding: 4px 8px; border-bottom: none; }

        /* Item name */
        .item-name { font-weight: 600; color: #111827; }
        .item-desc { color: #9ca3af; font-size: 9px; margin-top: 1px; }

        /* Totals */
        .totals-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        .totals-table td { padding: 4px 8px; font-size: 10px; color: #4b5563; }
        .totals-table .total-row td { font-weight: 800; font-size: 13px; color: #111827; border-top: 2px solid #1F2937; padding-top: 8px; }
        .totals-table .sub-row td { color: #6b7280; font-size: 9.5px; }

        /* Notes */
        .notes-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; margin-top: 10px; font-size: 10px; color: #374151; line-height: 1.5; white-space: pre-wrap; background: #fafafa; }

        /* Validity */
        .validity-bar { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #EA580C; border-radius: 0 6px 6px 0; padding: 8px 12px; margin-top: 12px; font-size: 10px; color: #374151; display: flex; justify-content: space-between; align-items: center; }
        .validity-bar strong { color: #111827; }

        /* Signatures */
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
        .sig-block { text-align: center; }
        .sig-line { border-top: 1px solid #374151; margin-bottom: 7px; }
        .sig-label { font-size: 10px; font-weight: 600; color: #111827; }
        .sig-sub { font-size: 9px; color: #9ca3af; margin-top: 2px; }

        /* Footer */
        .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }

        /* Print */
        @media print {
          @page { size: A4; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .page { padding: 12mm 14mm 16mm 14mm; }
          .no-print { display: none !important; }
        }

        /* Screen only */
        @media screen {
          .print-bar { position: fixed; top: 0; left: 0; right: 0; background: #1F2937; color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 100; font-size: 13px; }
          .print-bar button { background: #EA580C; color: white; font-weight: 700; border: none; padding: 7px 20px; border-radius: 6px; cursor: pointer; font-size: 13px; }
          .print-bar button:hover { background: #C2410C; }
          .page { margin-top: 52px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
        }
      `}</style>

      {/* Top bar — screen only */}
      <div className="print-bar no-print">
        <span>Orçamento {budget.code} — {budget.title}</span>
        <button onClick={() => window.print()}>Imprimir / Salvar PDF</button>
      </div>

      <div className="page">
        {/* ── Header ── */}
        <div className="header">
          <div className="logo-block">
            <img
              src="/logo.png"
              alt="Contécnica"
              style={{ height: 72, width: "auto", objectFit: "contain" }}
              onError={(e) => {
                const t = e.currentTarget;
                t.style.display = "none";
                const fallback = t.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div style={{ display: "none", alignItems: "center", gap: 8 }}>
              <div className="logo-icon">C</div>
              <div className="logo-text">
                <h1>Contécnica</h1>
                <p>Gestão de Reformas e Construções</p>
              </div>
            </div>
          </div>
          <div className="company-info">
            <strong>Contécnica Reformas Ltda.</strong><br />
            contecnica@email.com.br<br />
            (11) 99999-0000<br />
            CNPJ: 00.000.000/0001-00
          </div>
        </div>

        {/* ── Budget meta ── */}
        <div className="budget-meta">
          <div className="budget-meta-left">
            <h2>{budget.title}</h2>
            <div className="code">{budget.code}</div>
          </div>
          <div className="budget-meta-right">
            <div>Emitido em {fmtDate(budget.createdAt)}</div>
            {budget.validUntil && <div>Válido até {fmtDate(budget.validUntil)}</div>}
            <div className="status-badge">{STATUS_LABELS[budget.status]}</div>
          </div>
        </div>

        {/* ── Client + Address ── */}
        <div className="info-grid">
          <div className="info-box">
            <h3>Dados do Cliente</h3>
            <div className="info-row">
              <span className="info-label">Nome:</span>
              <span className="info-value">{client.name}</span>
            </div>
            {client.document && (
              <div className="info-row">
                <span className="info-label">CPF/CNPJ:</span>
                <span className="info-value">{client.document}</span>
              </div>
            )}
            {client.phone && (
              <div className="info-row">
                <span className="info-label">Telefone:</span>
                <span className="info-value">{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="info-row">
                <span className="info-label">E-mail:</span>
                <span className="info-value">{client.email}</span>
              </div>
            )}
            {clientAddressParts.length > 0 && (
              <div className="info-row">
                <span className="info-label">Endereço:</span>
                <span className="info-value">{clientAddressParts.join(", ")}</span>
              </div>
            )}
          </div>

          <div className="info-box">
            <h3>Endereço da Obra</h3>
            {addressParts.length > 0 ? (
              addressParts.map((part, i) => (
                <div key={i} className="info-row">
                  <span className="info-value">{part}</span>
                </div>
              ))
            ) : (
              <div className="info-row">
                <span className="info-value" style={{ color: "#9ca3af" }}>Não informado</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Catalog Items ── */}
        {Object.keys(itemsByCategory).length > 0 && (
          <>
            <div className="section-title">Itens do Orçamento</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Descrição</th>
                  <th className="right" style={{ width: "12%" }}>Qtd</th>
                  <th style={{ width: "8%" }}>Unid.</th>
                  <th className="right" style={{ width: "18%" }}>Valor Unit.</th>
                  <th className="right" style={{ width: "22%" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(itemsByCategory).map(([cat, items]: [string, any[]]) => (
                  <>
                    <tr key={`cat-${cat}`} className="cat-row">
                      <td colSpan={5}>{CATEGORY_LABELS[cat]}</td>
                    </tr>
                    {items.map((item: any) => (
                      <tr key={item.id}>
                        <td>
                          <div className="item-name">{item.reformItem?.name}</div>
                          {item.reformItem?.description && (
                            <div className="item-desc">{item.reformItem.description}</div>
                          )}
                        </td>
                        <td className="right">{fmtQty(item.quantity)}</td>
                        <td>{UNIT_LABELS[item.reformItem?.unit ?? "UNIT"]}</td>
                        <td className="right">{fmt(item.unitPrice)}</td>
                        <td className="right" style={{ fontWeight: 600 }}>{fmt(item.subtotal)}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ── Extra Items ── */}
        {(budget.extraItems ?? []).length > 0 && (
          <>
            <div className="section-title">Itens Adicionais</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Descrição</th>
                  <th className="right" style={{ width: "12%" }}>Qtd</th>
                  <th style={{ width: "8%" }}>Unid.</th>
                  <th className="right" style={{ width: "18%" }}>Valor Unit.</th>
                  <th className="right" style={{ width: "22%" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {budget.extraItems.map((e: any) => (
                  <tr key={e.id}>
                    <td>
                      <div className="item-name">{e.name}</div>
                      {e.description && <div className="item-desc">{e.description}</div>}
                    </td>
                    <td className="right">{fmtQty(e.quantity)}</td>
                    <td>{UNIT_LABELS[e.unit]}</td>
                    <td className="right">{fmt(e.unitPrice)}</td>
                    <td className="right" style={{ fontWeight: 600 }}>{fmt(e.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ── Totals ── */}
        <table className="totals-table">
          <tbody>
            {itemsTotal > 0 && extrasTotal > 0 && (
              <>
                <tr className="sub-row">
                  <td></td>
                  <td style={{ textAlign: "right" }}>Subtotal itens:</td>
                  <td style={{ textAlign: "right", width: "22%" }}>{fmt(itemsTotal)}</td>
                </tr>
                <tr className="sub-row">
                  <td></td>
                  <td style={{ textAlign: "right" }}>Itens adicionais:</td>
                  <td style={{ textAlign: "right" }}>{fmt(extrasTotal)}</td>
                </tr>
              </>
            )}
            <tr className="total-row">
              <td></td>
              <td style={{ textAlign: "right" }}>TOTAL DO ORÇAMENTO</td>
              <td style={{ textAlign: "right", width: "22%" }}>{fmt(budget.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        {/* ── Notes ── */}
        {budget.notes && (
          <>
            <div className="section-title">Observações</div>
            <div className="notes-box">{budget.notes}</div>
          </>
        )}

        {/* ── Validity notice ── */}
        {budget.validUntil && (
          <div className="validity-bar">
            <span>Este orçamento é válido até <strong>{fmtDate(budget.validUntil)}</strong>.</span>
            <span>Após esta data, os valores estão sujeitos a alterações.</span>
          </div>
        )}

        {/* ── Signatures ── */}
        <div className="signatures">
          <div className="sig-block">
            <div style={{ height: 48 }} />
            <div className="sig-line" />
            <div className="sig-label">{client.name}</div>
            <div className="sig-sub">Cliente — Aprovação do Orçamento</div>
            <div className="sig-sub" style={{ marginTop: 4 }}>Data: ______ / ______ / ________</div>
          </div>
          <div className="sig-block">
            <div style={{ height: 48 }} />
            <div className="sig-line" />
            <div className="sig-label">Contécnica Reformas Ltda.</div>
            <div className="sig-sub">Responsável Técnico</div>
            <div className="sig-sub" style={{ marginTop: 4 }}>Data: ______ / ______ / ________</div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="footer">
          <span>Contécnica Reformas Ltda. — CNPJ 00.000.000/0001-00</span>
          <span>Documento gerado em {fmtDate(new Date())} · {budget.code}</span>
        </div>
      </div>
    </>
  );
}
