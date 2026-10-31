import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { LEGAL_CONTROLLER } from "@/lib/legal";

export const Route = createFileRoute("/terms")({
	head: () => ({ meta: [{ title: "Termos de Uso — Quizio" }] }),
	component: TermsRoute,
});

const contact = (
	<a href={`mailto:${LEGAL_CONTROLLER.email}`}>{LEGAL_CONTROLLER.email}</a>
);

const SECTIONS: LegalSection[] = [
	{
		id: "aceite",
		title: "Aceite",
		content: (
			<p>
				Ao criar uma conta ou usar o Quizio, inclusive para jogar com um PIN,
				você concorda com estes Termos e com a{" "}
				<Link to="/privacy">Política de Privacidade</Link>. Se não concordar,
				não use o serviço.
			</p>
		),
	},
	{
		id: "servico",
		title: "O que é o Quizio",
		content: (
			<>
				<p>
					O Quizio é uma plataforma gratuita para criar quizzes e jogá-los ao
					vivo ou como tarefa, com relatórios, grupos, temas e um assistente de
					inteligência artificial. É um projeto pessoal mantido por{" "}
					{LEGAL_CONTROLLER.name}, sem planos pagos.
				</p>
				<p>
					O serviço é oferecido como está, conforme a disponibilidade. Podemos
					mudar, suspender ou encerrar funcionalidades a qualquer momento,
					avisando com antecedência sempre que possível, sobretudo antes de
					encerrar o serviço, para que você possa guardar o que precisar.
				</p>
			</>
		),
	},
	{
		id: "conta",
		title: "Sua conta",
		content: (
			<ul>
				<li>
					Contas de criador são para maiores de 18 anos, ou para adolescentes
					com autorização e acompanhamento dos pais ou responsáveis.
				</li>
				<li>
					Informe dados verdadeiros, mantenha a senha em segredo e avise-nos se
					suspeitar de uso indevido da conta. Você responde pelo que for feito
					com ela.
				</li>
				<li>
					As chaves de acesso e os agentes de IA que você conectar agem em seu
					nome: você é responsável pelo que eles fizerem e pode revogá-los a
					qualquer momento em Configurações.
				</li>
				<li>
					Você pode excluir a conta quando quiser em Configurações; os efeitos
					estão descritos na Política de Privacidade.
				</li>
			</ul>
		),
	},
	{
		id: "jogos",
		title: "Jogos, tarefas e grupos",
		content: (
			<ul>
				<li>
					Jogadores participam sem conta, com um apelido. Escolha apelidos
					respeitosos e que não revelem dados pessoais.
				</li>
				<li>
					Quem organiza um jogo, uma tarefa ou um grupo é responsável pelo uso
					que faz dele e dos resultados, inclusive quando os participantes são
					crianças ou adolescentes, e deve informá-los sobre como os resultados
					serão usados.
				</li>
				<li>
					O organizador pode remover jogadores e membros, e o administrador de
					um grupo pode excluir publicações.
				</li>
			</ul>
		),
	},
	{
		id: "conteudo",
		title: "O seu conteúdo",
		content: (
			<>
				<p>
					O que você cria (perguntas, imagens, arquivos, publicações) continua
					sendo seu. Você nos concede uma licença gratuita e não exclusiva, só
					para armazenar, exibir e processar esse conteúdo na medida necessária
					para o Quizio funcionar, inclusive para as pessoas com quem você o
					compartilhar ou o tornar público. A licença termina quando o conteúdo
					é excluído, exceto nas cópias que outras pessoas já tenham feito de
					quizzes que você compartilhou ou tornou públicos.
				</p>
				<p>
					Você garante que tem o direito de usar o que envia, incluindo imagens
					e textos de terceiros, e que respeita direitos autorais, de imagem e
					de privacidade.
				</p>
			</>
		),
	},
	{
		id: "regras",
		title: "O que não é permitido",
		content: (
			<ul>
				<li>
					publicar conteúdo ilegal, ofensivo, discriminatório, violento, sexual
					envolvendo menores ou que viole direitos de terceiros;
				</li>
				<li>assediar, intimidar ou expor outras pessoas;</li>
				<li>
					coletar dados de outras pessoas sem base legal, inclusive pedindo
					dados pessoais nos apelidos ou nas respostas;
				</li>
				<li>
					tentar acessar contas, jogos ou dados de outras pessoas, contornar os
					limites do serviço ou prejudicar o seu funcionamento;
				</li>
				<li>
					usar o Quizio para enviar spam ou distribuir software malicioso.
				</li>
			</ul>
		),
	},
	{
		id: "ia",
		title: "Assistente de inteligência artificial",
		content: (
			<p>
				As perguntas criadas pela IA podem conter erros. Revise-as antes de
				usar: você é responsável pelo que publica. O conteúdo enviado ao
				assistente é processado por um provedor externo, como explica a{" "}
				<Link to="/privacy">Política de Privacidade</Link>, e o uso tem um
				limite diário de créditos.
			</p>
		),
	},
	{
		id: "suspensao",
		title: "Suspensão e remoção",
		content: (
			<p>
				Podemos remover conteúdo e suspender ou encerrar contas que violem estes
				Termos ou a lei, ou que coloquem outras pessoas ou o serviço em risco.
				Para contestar, escreva para {contact}.
			</p>
		),
	},
	{
		id: "responsabilidade",
		title: "Responsabilidade",
		content: (
			<p>
				Fazemos o possível para manter o Quizio disponível e seguro, mas, por
				ser um serviço gratuito, não garantimos funcionamento ininterrupto ou
				livre de erros, nem a preservação permanente de dados: mantenha cópias
				do que for importante. Na medida permitida pela lei, não respondemos por
				danos indiretos nem por conteúdo publicado por usuários. Nada nestes
				Termos limita direitos que a lei garante a você, inclusive os do Código
				de Defesa do Consumidor.
			</p>
		),
	},
	{
		id: "alteracoes",
		title: "Alterações dos Termos",
		content: (
			<p>
				Podemos atualizar estes Termos. A data no topo indica a última versão;
				mudanças relevantes serão avisadas no próprio Quizio. Continuar usando o
				serviço depois disso significa aceitar a nova versão.
			</p>
		),
	},
	{
		id: "lei",
		title: "Lei aplicável e contato",
		content: (
			<p>
				Estes Termos seguem as leis do Brasil. Fica eleito o foro do domicílio
				do usuário para resolver qualquer questão. Dúvidas, pedidos e denúncias:{" "}
				{contact}.
			</p>
		),
	},
];

function TermsRoute() {
	return (
		<LegalPage
			title="Termos de Uso"
			intro={
				<p>
					Estes Termos explicam as regras para usar o Quizio: o que oferecemos,
					o que esperamos de quem usa e as responsabilidades de cada um.
				</p>
			}
			sections={SECTIONS}
			other={{ to: "/privacy", label: "Política de Privacidade" }}
		/>
	);
}
