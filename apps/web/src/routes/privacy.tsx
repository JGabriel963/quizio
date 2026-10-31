import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL_CONTROLLER } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({
	head: () => ({ meta: [{ title: "Política de Privacidade — Quizio" }] }),
	component: PrivacyRoute,
});

const contact = (
	<a href={`mailto:${LEGAL_CONTROLLER.email}`}>{LEGAL_CONTROLLER.email}</a>
);

/** The Privacy Policy, written for the LGPD (Lei nº 13.709/2018). */
const SECTIONS: LegalSection[] = [
	{
		id: "controlador",
		title: "Quem cuida dos seus dados",
		content: (
			<>
				<p>
					O Quizio é um projeto pessoal, gratuito e sem fins comerciais. O
					controlador dos dados pessoais tratados nele, nos termos da Lei Geral
					de Proteção de Dados (LGPD, Lei nº 13.709/2018), é{" "}
					<strong>{LEGAL_CONTROLLER.name}</strong>, que também atua como
					encarregado pelo tratamento de dados.
				</p>
				<p>
					Para qualquer assunto sobre os seus dados, escreva para {contact}.
				</p>
			</>
		),
	},
	{
		id: "dados",
		title: "Quais dados tratamos",
		content: (
			<>
				<p>
					Tratamos só o necessário para o Quizio funcionar. Não vendemos dados,
					não exibimos anúncios e não usamos ferramentas de rastreamento ou de
					publicidade.
				</p>
				<p>
					<strong>Quem cria uma conta</strong>
				</p>
				<ul>
					<li>
						Nome, e-mail e senha. A senha é guardada apenas como um resumo
						criptográfico (hash), nunca em texto.
					</li>
					<li>
						Se você entrar com o Google: o nome e o e-mail que o Google nos
						informa. Não lemos a sua foto, contatos ou outros dados da conta
						Google.
					</li>
					<li>A foto de perfil, se você enviar uma.</li>
					<li>
						Dados de sessão: endereço IP e navegador (user agent) de cada login,
						para manter você conectado e proteger a conta.
					</li>
					<li>
						O conteúdo que você cria: quizzes, perguntas, imagens, temas,
						grupos, publicações, arquivos enviados aos grupos, tarefas e
						relatórios.
					</li>
					<li>
						Preferências (como as opções de jogo) e o registro de uso do
						assistente de IA, para aplicar o limite diário de créditos.
					</li>
					<li>
						Se você conectar um agente de IA: as chaves de acesso (guardadas
						apenas como hash) e as autorizações concedidas.
					</li>
				</ul>
				<p>
					<strong>Quem joga</strong>
				</p>
				<ul>
					<li>
						Jogadores não criam conta. Guardamos o apelido escolhido, o
						personagem, as respostas, o tempo de cada resposta e a pontuação.
					</li>
					<li>
						Para permitir a volta ao jogo, o navegador do jogador guarda um
						identificador e um código secreto daquela partida.
					</li>
					<li>
						Recomendamos que ninguém use o nome completo ou outros dados
						pessoais como apelido.
					</li>
				</ul>
				<p>
					<strong>Todos os visitantes</strong>
				</p>
				<ul>
					<li>
						O endereço IP, usado por pouco tempo para limitar tentativas (como
						PINs errados, logins e envios de arquivos) e evitar abusos.
					</li>
				</ul>
			</>
		),
	},
	{
		id: "finalidades",
		title: "Para que usamos e com qual base legal",
		content: (
			<ul>
				<li>
					<strong>Prestar o serviço</strong> (criar e jogar quizzes, tarefas,
					grupos, relatórios, notificações): execução do contrato com você (art.
					7º, V, da LGPD), conforme os <Link to="/terms">Termos de Uso</Link>.
				</li>
				<li>
					<strong>Segurança e prevenção de abusos</strong> (sessões, limites de
					tentativas, registros técnicos): legítimo interesse (art. 7º, IX) e
					proteção do próprio titular.
				</li>
				<li>
					<strong>Assistente de IA</strong>, quando você o usa: execução do
					contrato, a seu pedido.
				</li>
				<li>
					<strong>Cumprir obrigações legais</strong> e atender ordens de
					autoridades: art. 7º, II e VI.
				</li>
			</ul>
		),
	},
	{
		id: "compartilhamento",
		title: "Com quem os dados são compartilhados",
		content: (
			<>
				<p>
					Os dados são processados por fornecedores que operam a infraestrutura
					do Quizio, apenas para essa finalidade:
				</p>
				<ul>
					<li>
						<strong>Hospedagem do aplicativo</strong> (Vercel), com servidores
						em São Paulo.
					</li>
					<li>
						<strong>Banco de dados</strong> PostgreSQL, hospedado em São Paulo.
					</li>
					<li>
						<strong>Armazenamento de arquivos</strong> (Cloudflare R2): imagens,
						fotos, temas e arquivos dos grupos.
					</li>
					<li>
						<strong>Tempo real</strong> (Pusher): avisos de que algo mudou no
						jogo ou nas notificações. Não transporta pontuações nem respostas.
					</li>
					<li>
						<strong>Login com o Google</strong>, se você escolher essa opção.
					</li>
					<li>
						<strong>Provedor de inteligência artificial</strong> (como
						Anthropic, OpenAI ou Google), apenas quando você usa o assistente de
						criação: recebe o tema, as instruções e as páginas do PDF que você
						escolheu. Esse conteúdo não é usado por nós para outra finalidade.
					</li>
				</ul>
				<p>
					Dentro do Quizio, outras pessoas veem dados seus conforme o uso: quem
					organiza um jogo ou uma tarefa vê os apelidos, as respostas e as
					pontuações; os membros de um grupo veem o seu nome e foto (e o
					administrador vê o e-mail); o seu perfil público mostra nome, foto e
					os quizzes que você marcou como públicos.
				</p>
				<p>
					Também podemos fornecer dados quando a lei ou uma ordem judicial
					exigir.
				</p>
			</>
		),
	},
	{
		id: "transferencia",
		title: "Transferência internacional",
		content: (
			<p>
				Alguns fornecedores ficam ou têm empresas fora do Brasil (por exemplo,
				nos Estados Unidos), e o conteúdo enviado ao assistente de IA é
				processado no exterior. Essas transferências se apoiam no art. 33 da
				LGPD, em especial nas cláusulas contratuais e nas garantias de proteção
				de dados oferecidas por esses fornecedores, e na necessidade para
				executar o serviço que você pediu.
			</p>
		),
	},
	{
		id: "retencao",
		title: "Por quanto tempo guardamos",
		content: (
			<ul>
				<li>
					<strong>Conta e conteúdo</strong>: enquanto a conta existir. Ao
					excluir a conta, apagamos os dados, os quizzes, as imagens, os grupos
					que você administra e os jogos que você organizou.
				</li>
				<li>
					<strong>Relatórios e respostas de jogadores</strong>: até quem
					organizou excluir o relatório ou a própria conta.
				</li>
				<li>
					<strong>PDFs enviados ao assistente de IA</strong>: apagados ao fechar
					o assistente ou, no máximo, em 24 horas.
				</li>
				<li>
					<strong>Arquivos enviados e não usados</strong>: apagados em cerca de
					24 horas.
				</li>
				<li>
					<strong>Notificações lidas</strong>: deixam de aparecer após 90 dias.
				</li>
				<li>
					<strong>Registros de tentativas por IP</strong>: descartados
					periodicamente, logo depois da janela de limite.
				</li>
				<li>
					<strong>Motivo da exclusão da conta</strong>, se você informar: é
					guardado sem nenhum vínculo com você, só para melhorar o serviço.
				</li>
			</ul>
		),
	},
	{
		id: "direitos",
		title: "Seus direitos",
		content: (
			<>
				<p>Pela LGPD (art. 18), você pode pedir, a qualquer momento:</p>
				<ul>
					<li>a confirmação de que tratamos dados seus e o acesso a eles;</li>
					<li>a correção de dados incompletos, inexatos ou desatualizados;</li>
					<li>
						a anonimização, o bloqueio ou a eliminação de dados desnecessários;
					</li>
					<li>a portabilidade dos dados;</li>
					<li>a eliminação dos dados e informações sobre compartilhamento;</li>
					<li>a revisão de decisões tomadas só por meios automatizados;</li>
					<li>a revogação de um consentimento que tenha dado.</li>
				</ul>
				<p>
					Você mesmo pode alterar nome, foto e senha e excluir a conta em
					Configurações. Para os demais pedidos, escreva para {contact}.
					Respondemos em até 15 dias. Você também pode reclamar à Autoridade
					Nacional de Proteção de Dados (
					<a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer">
						ANPD
					</a>
					).
				</p>
			</>
		),
	},
	{
		id: "criancas",
		title: "Crianças e adolescentes",
		content: (
			<>
				<p>
					Contas de criador são para maiores de 18 anos, ou para adolescentes
					com autorização e acompanhamento dos pais ou responsáveis.
				</p>
				<p>
					Estudantes de qualquer idade podem jogar sem conta, informando apenas
					um apelido. Quem organiza o jogo (por exemplo, o professor ou a
					escola) é responsável por orientar os participantes a não usar dados
					pessoais no apelido e por tratar os resultados no melhor interesse das
					crianças e adolescentes, como pede o art. 14 da LGPD.
				</p>
			</>
		),
	},
	{
		id: "cookies",
		title: "Cookies e armazenamento no navegador",
		content: (
			<>
				<p>
					Usamos apenas o essencial para o funcionamento, sem cookies de
					publicidade ou de análise:
				</p>
				<ul>
					<li>o cookie de sessão, que mantém você conectado;</li>
					<li>
						o armazenamento local do navegador, para lembrar a partida de um
						jogador, o personagem escolhido, cores personalizadas e preferências
						de exibição.
					</li>
				</ul>
				<p>
					Você pode apagá-los nas configurações do navegador; isso encerra a
					sessão e faz o Quizio esquecer essas escolhas.
				</p>
			</>
		),
	},
	{
		id: "seguranca",
		title: "Segurança",
		content: (
			<p>
				Usamos conexões criptografadas (HTTPS), senhas e chaves guardadas como
				hash, controle de acesso a cada recurso, limites contra tentativas
				abusivas e cabeçalhos de segurança. Nenhum sistema é totalmente imune a
				falhas; se ocorrer um incidente de segurança que possa trazer risco ou
				dano relevante, comunicaremos os afetados e a ANPD, como manda a lei.
			</p>
		),
	},
	{
		id: "alteracoes",
		title: "Alterações desta política",
		content: (
			<p>
				Podemos atualizar esta política para refletir mudanças no Quizio ou na
				lei. A data no topo indica a última versão; mudanças relevantes serão
				avisadas no próprio Quizio.
			</p>
		),
	},
];

function PrivacyRoute() {
	return (
		<LegalPage
			title="Política de Privacidade"
			intro={
				<p>
					Esta política explica quais dados pessoais o Quizio trata, por que,
					com quem os compartilha, por quanto tempo os guarda e como você exerce
					os seus direitos, de acordo com a Lei Geral de Proteção de Dados
					(LGPD) e o Marco Civil da Internet.
				</p>
			}
			sections={SECTIONS}
			other={{ to: "/terms", label: "Termos de Uso" }}
		/>
	);
}
