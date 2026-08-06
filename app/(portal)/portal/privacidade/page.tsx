import Link from "next/link";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";
import { ArrowLeft } from "lucide-react";

/**
 * Política de Privacidade do Portal do Cliente.
 *
 * Página PÚBLICA de propósito (liberada no middleware): o cliente precisa poder
 * ler antes de aceitar, e o texto tem de ficar acessível a quem já usa o portal
 * sem exigir login.
 *
 * Ao alterar o texto de forma relevante, incremente PRIVACY_POLICY_VERSION em
 * lib/privacy.ts — todos os clientes voltam a ver a tela de aceite.
 *
 * ⚠️ ANTES DE PUBLICAR: preencha os dados marcados com [PREENCHER] e mande um
 * advogado revisar. Este texto descreve com precisão o que o sistema faz, mas a
 * adequação à LGPD depende também de práticas internas que o código não conhece
 * (quem tem acesso, por quanto tempo guarda backup, contrato com fornecedores).
 */

const ATUALIZADO_EM = "6 de agosto de 2026";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold text-gray-900">{titulo}</h2>
      <div className="space-y-2 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/portal/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao portal
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-7">
          <header className="space-y-1 pb-2">
            <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
            <p className="text-sm text-gray-500">
              Portal do Cliente Contécnica · Atualizada em {ATUALIZADO_EM} · Versão{" "}
              {PRIVACY_POLICY_VERSION}
            </p>
          </header>

          <Secao titulo="1. Quem trata os seus dados">
            <p>
              <strong>[PREENCHER: razão social]</strong>, CNPJ{" "}
              <strong>[PREENCHER]</strong>, com sede em <strong>[PREENCHER: endereço]</strong>,
              aqui chamada &quot;Contécnica&quot;, é a controladora dos dados pessoais tratados
              neste portal, nos termos da Lei nº 13.709/2018 (LGPD).
            </p>
            <p>
              Encarregado pelo tratamento de dados pessoais (DPO):{" "}
              <strong>[PREENCHER: nome]</strong> — <strong>[PREENCHER: e-mail]</strong>.
            </p>
          </Secao>

          <Secao titulo="2. Quais dados tratamos">
            <p>Neste portal tratamos os seguintes dados:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Identificação e contato:</strong> nome ou razão social, CPF ou CNPJ,
                telefone, e-mail e endereço. Fornecidos por você na contratação.
              </li>
              <li>
                <strong>Acesso ao portal:</strong> e-mail de login, senha (guardada apenas como
                hash criptográfico, não temos como ler a sua senha), data e hora do último
                acesso.
              </li>
              <li>
                <strong>Dados da sua obra:</strong> endereço, cronograma, tarefas executadas,
                fotos do andamento, documentos e informações da equipe alocada.
              </li>
              <li>
                <strong>Dados financeiros e contratuais:</strong> orçamentos, contratos,
                contrato assinado eletronicamente com data e hora, serviços extras aprovados ou
                recusados, materiais a reembolsar, notas fiscais que liberamos para você e
                pagamentos realizados.
              </li>
            </ul>
            <p>
              Não coletamos dados sensíveis (origem racial, saúde, religião, biometria,
              convicção política) e não usamos os seus dados para publicidade ou perfilamento.
            </p>
          </Secao>

          <Secao titulo="3. Para que usamos e com que base legal">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Executar o contrato de obra</strong> — acompanhamento, comunicação,
                aprovação de serviços extras, cobrança e recebimento.{" "}
                <em>Base: execução de contrato (art. 7º, V, LGPD).</em>
              </li>
              <li>
                <strong>Cumprir obrigações legais e fiscais</strong> — emissão e guarda de
                documentos.{" "}
                <em>Base: cumprimento de obrigação legal (art. 7º, II).</em>
              </li>
              <li>
                <strong>Segurança do acesso</strong> — registro de último acesso e proteção
                contra tentativas abusivas de login.{" "}
                <em>Base: legítimo interesse (art. 7º, IX).</em>
              </li>
              <li>
                <strong>Defesa em processo</strong>, quando necessário.{" "}
                <em>Base: art. 7º, VI.</em>
              </li>
            </ul>
          </Secao>

          <Secao titulo="4. Com quem compartilhamos">
            <p>
              Não vendemos nem cedemos os seus dados. Compartilhamos apenas o necessário, com
              fornecedores que atuam como operadores:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Mercado Pago</strong> — processamento dos pagamentos que você fizer pelo
                portal. Recebe o seu e-mail, nome e o valor. Os dados do seu cartão são
                digitados no ambiente do Mercado Pago e <strong>nunca passam pelo nosso
                servidor</strong>.
              </li>
              <li>
                <strong>Provedor de hospedagem</strong> — mantém o servidor onde o sistema roda.
              </li>
              <li>
                <strong>Serviço de leitura automática de notas fiscais</strong> — quando a
                Contécnica lança uma despesa a partir da foto de uma nota, a imagem é enviada
                para leitura automatizada dos valores. A nota pode conter o endereço da obra.
              </li>
              <li>
                <strong>Autoridades públicas</strong>, quando houver obrigação legal ou ordem
                judicial.
              </li>
            </ul>
          </Secao>

          <Secao titulo="5. Cookies">
            <p>
              Usamos <strong>um único cookie</strong>, necessário para manter você conectado
              depois do login. Ele não rastreia a sua navegação fora do portal e expira em 30
              dias. Não usamos cookies de publicidade, analytics ou de terceiros.
            </p>
            <p>
              Bloquear esse cookie impede o funcionamento do portal, porque não haveria como
              manter a sessão.
            </p>
          </Secao>

          <Secao titulo="6. Por quanto tempo guardamos">
            <p>
              Os dados da obra e do contrato ficam guardados enquanto a relação estiver ativa e,
              depois, pelo prazo exigido pela legislação fiscal e civil —{" "}
              <strong>em regra 5 anos</strong> contados do encerramento, e mais tempo se houver
              discussão judicial em curso.
            </p>
            <p>
              O seu acesso ao portal pode ser desativado a qualquer momento, a seu pedido ou ao
              fim da obra, sem que isso apague os documentos que a lei nos obriga a guardar.
            </p>
          </Secao>

          <Secao titulo="7. Como protegemos">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Todo o acesso ao portal é feito por conexão criptografada (HTTPS).</li>
              <li>
                Sua senha é guardada com hash <em>bcrypt</em> — nem a Contécnica consegue
                lê-la. Por isso, quando você esquece a senha, ela é redefinida e não recuperada.
              </li>
              <li>
                Você só vê dados das <strong>suas</strong> obras. Fotos, documentos e notas
                fiscais são verificados no servidor a cada acesso ao arquivo.
              </li>
              <li>Limitação de tentativas de login para conter ataques de força bruta.</li>
              <li>
                A senha do primeiro acesso, definida pela Contécnica, precisa ser trocada por
                você antes de usar o portal.
              </li>
            </ul>
          </Secao>

          <Secao titulo="8. Os seus direitos">
            <p>Pela LGPD (art. 18), você pode a qualquer momento pedir:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>confirmação de que tratamos os seus dados, e acesso a eles;</li>
              <li>correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>
                anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
                desconformidade com a lei;
              </li>
              <li>portabilidade dos dados a outro fornecedor;</li>
              <li>informação sobre com quem compartilhamos os seus dados;</li>
              <li>
                revogação do consentimento, quando o tratamento se basear nele — lembrando que
                dados necessários para o contrato e para obrigações legais continuam sendo
                tratados.
              </li>
            </ul>
            <p>
              Para exercer qualquer desses direitos, escreva para{" "}
              <strong>[PREENCHER: e-mail do encarregado]</strong>. Respondemos em até 15 dias.
            </p>
            <p>
              Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em{" "}
              <span className="font-mono text-gray-500">gov.br/anpd</span>.
            </p>
          </Secao>

          <Secao titulo="9. Alterações nesta política">
            <p>
              Se mudarmos este texto de forma relevante, o portal pedirá o seu aceite novamente
              no próximo acesso, e a versão que você aceitou fica registrada com data e hora.
            </p>
          </Secao>

          <footer className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Dúvidas sobre esta política: <strong>[PREENCHER: e-mail]</strong> · Versão{" "}
              {PRIVACY_POLICY_VERSION}
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
