import sharp from "sharp";
import { copyFile, stat } from "fs/promises";
import { join } from "path";

/**
 * Recorta a margem transparente de public/logo.png.
 *
 * Arquivos de logo quase sempre vêm com uma borda vazia embutida. Como as telas
 * dimensionam a IMAGEM (margem inclusa), o desenho acaba pequeno dentro de uma
 * placa branca grande e vazia. Removendo a borda, o logo passa a preencher o
 * espaço disponível.
 *
 * Uso (na raiz do projeto):
 *   node scripts/trim-logo.mjs
 *
 * Guarda um backup em public/logo.original.png na primeira execução, então é
 * seguro rodar mais de uma vez. Usa o sharp, que já vem instalado com o Next —
 * nada a instalar.
 */

const LOGO = join(process.cwd(), "public", "logo.png");
const BACKUP = join(process.cwd(), "public", "logo.original.png");

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function main() {
  if (!(await exists(LOGO))) {
    console.error("❌ public/logo.png não encontrado. Envie o logo antes de recortar.");
    process.exit(1);
  }

  // Backup só na primeira vez, para nunca perder o original.
  if (!(await exists(BACKUP))) {
    await copyFile(LOGO, BACKUP);
    console.log("💾 Backup criado: public/logo.original.png");
  } else {
    console.log("💾 Backup já existia: public/logo.original.png (recortando a partir dele)");
  }

  const before = await sharp(BACKUP).metadata();

  // trim() remove as bordas uniformes (aqui, transparentes) mantendo o desenho.
  const out = await sharp(BACKUP).trim().png().toBuffer();
  const after = await sharp(out).metadata();

  if (after.width === before.width && after.height === before.height) {
    console.log(`\nℹ️  Nada a recortar: o logo já ocupa todo o arquivo (${before.width}x${before.height}).`);
    console.log("   Se ele ainda parece pequeno, o espaço vazio faz parte do desenho —");
    console.log("   nesse caso é preciso editar a imagem, não recortar.\n");
    return;
  }

  await sharp(out).toFile(LOGO);

  const pctW = Math.round((after.width / before.width) * 100);
  const pctH = Math.round((after.height / before.height) * 100);
  console.log(`\n✅ Logo recortado.`);
  console.log(`   Antes:  ${before.width}x${before.height}`);
  console.log(`   Depois: ${after.width}x${after.height}  (o desenho ocupava ${pctW}% da largura e ${pctH}% da altura)`);
  console.log(`\n   Agora rode: pm2 restart contecnica  — e no navegador Ctrl+Shift+R\n`);
  console.log(`   Para voltar ao original:`);
  console.log(`   cp public/logo.original.png public/logo.png && pm2 restart contecnica\n`);
}

main().catch((e) => {
  console.error("❌ Erro:", e instanceof Error ? e.message : e);
  process.exit(1);
});
