import type { CompletionReportData, CompletionPhoto } from "@/lib/completion-report";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d: Date | null | undefined) {
  if (!d) return "—";
  const iso = new Date(d).toISOString().slice(0, 10);
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

function diasEntre(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms < 0) return null;
  return Math.round(ms / 86_400_000);
}

const CAM = (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <circle cx="12" cy="13" r="3.5" />
    <path d="M8 6l1.5-2h5L16 6" />
  </svg>
);

function PhotoGrid({ items }: { items: CompletionPhoto[] }) {
  return (
    <div className="gallery">
      {items.map((p, i) => (
        <div className="shot" key={i}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imageUrl} alt={p.description ?? "Foto da obra"} />
          {p.description && <div className="cap">{p.description}</div>}
        </div>
      ))}
    </div>
  );
}

export function CompletionReportView({ data }: { data: CompletionReportData }) {
  const { project, client, company, payments, extras, steps, photos, timeline } = data;
  const dias = diasEntre(project.startDate, project.endDate);
  const doneCount = steps.filter((s) => s.done).length;
  const hasPhotos = photos.before.length + photos.after.length + photos.general.length > 0;

  const CSS = `
    @page { margin: 1.6cm 1.4cm; size: A4; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:"IBM Plex Sans",system-ui,-apple-system,sans-serif; color:#1c1a17; background:#f4f1ea; line-height:1.55; }
    .wrap { max-width:840px; margin:0 auto; padding:24px 16px; }
    @media print { body { background:#fff; } .wrap { max-width:none; padding:0; } .toolbar { display:none; } .doc { border:none; box-shadow:none; } section { break-inside:avoid; } }

    .toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:18px; flex-wrap:wrap; }
    .note { font-size:12px; color:#9a3d0a; background:#fceadd; padding:6px 12px; border-radius:999px; font-weight:500; }
    .btn { font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; background:#ea580c; color:#fff; border:none; border-radius:9px; padding:9px 18px; }

    .doc { background:#fff; border:1px solid #e6e1d7; border-radius:6px; box-shadow:0 12px 32px rgba(28,26,23,.08); overflow:hidden; }
    .cover { padding:44px 48px 34px; border-bottom:3px solid #ea580c; }
    .brand { display:flex; align-items:center; gap:13px; margin-bottom:34px; }
    .brand img.logo { max-height:52px; max-width:200px; object-fit:contain; }
    .brand .fallback { width:46px; height:46px; border-radius:10px; background:#ea580c; }
    .brand-name { font-weight:700; font-size:16px; }
    .brand-sub { font-size:12px; color:#6f6a62; }
    .eyebrow { font-size:12px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:#9a3d0a; margin-bottom:12px; }
    h1 { font-family:"Fraunces",Georgia,serif; font-weight:600; font-size:clamp(28px,5.5vw,42px); line-height:1.1; letter-spacing:-.01em; margin-bottom:8px; }
    .obra-sub { font-size:15px; color:#6f6a62; margin-bottom:22px; }
    .badge { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:#15803d; background:#e6f2ea; padding:6px 14px; border-radius:999px; }
    .badge .dot { width:7px; height:7px; border-radius:50%; background:#15803d; }

    section { padding:30px 48px; border-top:1px solid #e6e1d7; }
    .sec-head { display:flex; align-items:baseline; gap:12px; margin-bottom:20px; }
    .sec-num { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:13px; font-weight:600; color:#ea580c; }
    .sec-title { font-family:"Fraunces",Georgia,serif; font-weight:600; font-size:21px; }

    .facts { display:grid; grid-template-columns:repeat(2,1fr); gap:1px; background:#e6e1d7; border:1px solid #e6e1d7; border-radius:8px; overflow:hidden; }
    .fact { background:#fff; padding:13px 17px; }
    .fact .k { font-size:11px; letter-spacing:.07em; text-transform:uppercase; color:#a49c8f; margin-bottom:3px; }
    .fact .v { font-size:15px; font-weight:500; }

    .prose { font-size:14.5px; max-width:64ch; }
    .prose p { margin-bottom:12px; }

    .progress-row { display:flex; align-items:center; gap:14px; margin:16px 0 6px; }
    .progress-row .lbl { font-size:13px; color:#6f6a62; min-width:96px; }
    .bar { flex:1; height:12px; border-radius:999px; background:#e6e1d7; overflow:hidden; }
    .bar > i { display:block; height:100%; background:#15803d; }
    .pct { font-family:"IBM Plex Mono",monospace; font-weight:600; font-size:15px; color:#15803d; }

    .tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
    .tile { background:#faf8f3; border:1px solid #e6e1d7; border-radius:10px; padding:15px 16px 17px; }
    .tile .k { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#a49c8f; margin-bottom:7px; }
    .tile .v { font-family:"IBM Plex Mono",monospace; font-weight:600; font-size:19px; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
    .v-pos { color:#15803d; } .v-accent { color:#ea580c; }

    .tbl-wrap { overflow-x:auto; border:1px solid #e6e1d7; border-radius:8px; }
    table { width:100%; border-collapse:collapse; font-size:13.5px; }
    th, td { text-align:left; padding:10px 14px; border-bottom:1px solid #e6e1d7; }
    th { font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#a49c8f; font-weight:600; background:#faf8f3; }
    tbody tr:last-child td { border-bottom:none; }
    td.num, th.num { text-align:right; font-family:"IBM Plex Mono",monospace; font-variant-numeric:tabular-nums; }
    tr.total td { font-weight:700; background:#faf8f3; }
    .pill { display:inline-flex; align-items:center; font-size:11px; font-weight:600; padding:3px 9px; border-radius:999px; }
    .pill.ok { color:#15803d; background:#e6f2ea; }
    .pill.wait { color:#9a3d0a; background:#fceadd; }

    .steps { display:grid; grid-template-columns:repeat(2,1fr); gap:9px 24px; }
    .step { display:flex; align-items:center; gap:10px; font-size:14px; }
    .check { width:20px; height:20px; border-radius:50%; display:grid; place-items:center; flex-shrink:0; }
    .check.on { background:#e6f2ea; color:#15803d; }
    .check.off { border:1.5px solid #d5cec1; }

    .subhead { font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#9a3d0a; font-weight:600; margin:20px 0 10px; }
    .gallery { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
    .shot { border:1px solid #e6e1d7; border-radius:10px; overflow:hidden; background:#faf8f3; }
    .shot img { width:100%; aspect-ratio:4/3; object-fit:cover; display:block; }
    .shot .cap { padding:8px 11px; font-size:12px; color:#6f6a62; }

    .timeline { margin-left:6px; padding-left:24px; border-left:2px solid #e6e1d7; display:grid; gap:18px; }
    .tl { position:relative; }
    .tl::before { content:""; position:absolute; left:-31px; top:4px; width:11px; height:11px; border-radius:50%; background:#ea580c; border:2px solid #fff; }
    .tl .d { font-family:"IBM Plex Mono",monospace; font-size:12px; color:#9a3d0a; font-weight:600; }
    .tl .t { font-weight:600; font-size:14.5px; }
    .tl .x { font-size:13px; color:#6f6a62; }

    .sigs { display:grid; grid-template-columns:1fr 1fr; gap:48px; margin-top:20px; }
    .sig { text-align:center; }
    .sig .space { height:60px; display:grid; place-items:end center; }
    .sig .space img { max-height:56px; object-fit:contain; margin-bottom:-4px; }
    .sig .line { border-top:1.5px solid #1c1a17; padding-top:8px; }
    .sig .role { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#a49c8f; }
    .sig .who { font-weight:600; font-size:14px; }
    .sig .cpf { font-size:12px; color:#6f6a62; }

    .foot { padding:18px 48px 26px; border-top:1px solid #e6e1d7; display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px; font-size:11.5px; color:#a49c8f; }

    @media (max-width:640px) {
      .cover { padding:30px 22px 26px; } section { padding:24px 22px; } .foot { padding:16px 22px; }
      .facts, .steps { grid-template-columns:1fr; } .tiles { grid-template-columns:1fr; } .gallery { grid-template-columns:repeat(2,1fr); }
      .sigs { grid-template-columns:1fr; gap:34px; }
    }
  `;

  let secNum = 0;
  const n = () => String(++secNum).padStart(2, "0");

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Relatório de Conclusão — {project.name}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <div className="wrap">
          <div className="toolbar">
            <span className="note">Relatório de conclusão</span>
            <button className="btn" id="print-btn">Imprimir / Salvar PDF</button>
          </div>

          <article className="doc">
            {/* CAPA */}
            <div className="cover">
              <div className="brand">
                {company.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="logo" src={company.logoUrl} alt={company.name} />
                ) : (
                  <>
                    <div className="fallback" />
                    <div>
                      <div className="brand-name">{company.name || "—"}</div>
                      {company.cnpj && <div className="brand-sub">CNPJ {company.cnpj}</div>}
                    </div>
                  </>
                )}
              </div>
              <div className="eyebrow">Relatório de Conclusão de Obra</div>
              <h1>{project.name}</h1>
              <div className="obra-sub">
                Cliente: {client.name}
                {project.address ? ` · ${project.address}` : ""}
              </div>
              <span className="badge">
                <span className="dot" /> Obra concluída{project.endDate ? ` em ${fmtData(project.endDate)}` : ""}
              </span>
            </div>

            {/* DADOS DA OBRA */}
            <section>
              <div className="sec-head"><span className="sec-num">{n()}</span><h2 className="sec-title">Dados da obra</h2></div>
              <div className="facts">
                <div className="fact"><div className="k">Cliente</div><div className="v">{client.name}</div></div>
                {project.address && <div className="fact"><div className="k">Endereço</div><div className="v">{project.address}</div></div>}
                <div className="fact"><div className="k">Início</div><div className="v">{fmtData(project.startDate)}</div></div>
                <div className="fact"><div className="k">Conclusão</div><div className="v">{fmtData(project.endDate)}</div></div>
                {dias != null && <div className="fact"><div className="k">Duração</div><div className="v">{dias} dias</div></div>}
                {company.name && <div className="fact"><div className="k">Responsável</div><div className="v">{company.name}</div></div>}
              </div>
            </section>

            {/* RESUMO EXECUTIVO */}
            <section>
              <div className="sec-head"><span className="sec-num">{n()}</span><h2 className="sec-title">Resumo executivo</h2></div>
              {project.description && (
                <div className="prose"><p>{project.description}</p></div>
              )}
              <div className="progress-row">
                <span className="lbl">Progresso físico</span>
                <div className="bar"><i style={{ width: `${project.progress}%` }} /></div>
                <span className="pct">{project.progress}%</span>
              </div>
              {steps.length > 0 && (
                <div style={{ fontSize: "13px", color: "#6f6a62" }}>
                  {doneCount} de {steps.length} etapas concluídas
                </div>
              )}
            </section>

            {/* PAGAMENTOS */}
            <section>
              <div className="sec-head"><span className="sec-num">{n()}</span><h2 className="sec-title">Resumo de pagamentos</h2></div>
              <div className="tiles">
                <div className="tile"><div className="k">Valor do contrato</div><div className="v">{money(payments.contractTotal)}</div></div>
                <div className="tile"><div className="k">Total pago</div><div className="v v-pos">{money(payments.received)}</div></div>
                <div className="tile"><div className="k">Saldo</div><div className="v v-accent">{money(payments.pending)}</div></div>
              </div>
              {payments.parcelas.length > 0 && (
                <div className="tbl-wrap" style={{ marginTop: "18px" }}>
                  <table>
                    <thead><tr><th>Parcela</th><th>Vencimento</th><th className="num">Valor</th><th>Status</th></tr></thead>
                    <tbody>
                      {payments.parcelas.map((p, i) => (
                        <tr key={i}>
                          <td>{p.description}</td>
                          <td>{fmtData(p.dueDate)}</td>
                          <td className="num">{money(p.amount)}</td>
                          <td><span className={`pill ${p.received ? "ok" : "wait"}`}>{p.received ? "Pago" : "Pendente"}</span></td>
                        </tr>
                      ))}
                      <tr className="total"><td colSpan={2}>Total</td><td className="num">{money(payments.contractTotal)}</td><td /></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* SERVIÇOS EXTRAS */}
            {extras.length > 0 && (
              <section>
                <div className="sec-head"><span className="sec-num">{n()}</span><h2 className="sec-title">Serviços extras aprovados</h2></div>
                <div className="tbl-wrap">
                  <table>
                    <thead><tr><th>Descrição</th><th className="num">Valor</th></tr></thead>
                    <tbody>
                      {extras.map((e, i) => (
                        <tr key={i}><td>{e.name}</td><td className="num">{money(e.amount)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ETAPAS */}
            {steps.length > 0 && (
              <section>
                <div className="sec-head"><span className="sec-num">{n()}</span><h2 className="sec-title">Etapas executadas</h2></div>
                <div className="steps">
                  {steps.map((s, i) => (
                    <div className="step" key={i}>
                      <span className={`check ${s.done ? "on" : "off"}`}>
                        {s.done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </span>
                      {s.name}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FOTOS */}
            {hasPhotos && (
              <section>
                <div className="sec-head"><span className="sec-num">{n()}</span><h2 className="sec-title">Registro fotográfico</h2></div>
                {photos.before.length > 0 && (<><div className="subhead">Antes</div><PhotoGrid items={photos.before} /></>)}
                {photos.after.length > 0 && (<><div className="subhead">Depois</div><PhotoGrid items={photos.after} /></>)}
                {photos.general.length > 0 && (<><div className="subhead">Registros da obra</div><PhotoGrid items={photos.general} /></>)}
              </section>
            )}

            {/* LINHA DO TEMPO */}
            {timeline.length > 0 && (
              <section>
                <div className="sec-head"><span className="sec-num">{n()}</span><h2 className="sec-title">Linha do tempo</h2></div>
                <div className="timeline">
                  {timeline.map((t, i) => (
                    <div className="tl" key={i}>
                      <div className="d">{fmtData(t.date)}</div>
                      <div className="t">{t.title}</div>
                      {t.description && <div className="x">{t.description}</div>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* OBSERVAÇÕES + ASSINATURAS */}
            <section>
              <div className="sec-head"><span className="sec-num">{n()}</span><h2 className="sec-title">Encerramento</h2></div>
              <div className="prose" style={{ marginBottom: "30px" }}>
                <p>
                  {project.notes ||
                    "Declaramos a obra concluída e entregue em conformidade com o combinado. Agradecemos pela confiança."}
                </p>
              </div>
              <div className="sigs">
                <div className="sig">
                  <div className="space">
                    {company.signatureUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={company.signatureUrl} alt="Assinatura" />
                    )}
                  </div>
                  <div className="line">
                    <div className="role">Responsável pela obra</div>
                    <div className="who">{company.name || "—"}</div>
                    {company.cnpj && <div className="cpf">CNPJ {company.cnpj}</div>}
                  </div>
                </div>
                <div className="sig">
                  <div className="space" />
                  <div className="line">
                    <div className="role">Cliente</div>
                    <div className="who">{client.name}</div>
                    {client.document && <div className="cpf">CPF/CNPJ {client.document}</div>}
                  </div>
                </div>
              </div>
            </section>

            <div className="foot">
              <span>Relatório de Conclusão · {project.name}</span>
              <span>{company.name ? `${company.name} · ` : ""}Gerado pelo sistema Contécnica</span>
            </div>
          </article>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.getElementById('print-btn').addEventListener('click',function(){window.print()});",
          }}
        />
      </body>
    </html>
  );
}
