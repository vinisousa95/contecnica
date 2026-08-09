import bcrypt from "bcryptjs";

/**
 * Comparação "de sacrifício" para logins com e-mail inexistente.
 *
 * Sem isto, e-mail não cadastrado responde em ~1 ms (só a consulta) e e-mail
 * cadastrado com senha errada responde em ~80 ms (consulta + bcrypt). A
 * diferença de tempo permite enumerar quais e-mails têm conta, mesmo com a
 * mensagem de erro idêntica. Comparar contra este hash iguala os dois caminhos.
 *
 * Arquivo separado de lib/auth.ts DE PROPÓSITO: aquele módulo entra no bundle
 * do middleware (Edge) e não deve carregar bcryptjs. Importe este só em rotas.
 */
const DUMMY_HASH = bcrypt.hashSync("dummy-timing-equalizer", 10);

export async function dummyPasswordCompare(): Promise<void> {
  await bcrypt.compare("wrong-password", DUMMY_HASH);
}
