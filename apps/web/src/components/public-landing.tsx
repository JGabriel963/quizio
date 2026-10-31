import {
	ANSWER_COLOR_CLASSES,
	AnswerShape,
	type AnswerShapeName,
} from "@quizio/ui/components/answer-shape";
import { buttonVariants } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	BarChart3Icon,
	BotIcon,
	CalendarClockIcon,
	ListChecksIcon,
	type LucideIcon,
	PaletteIcon,
	SparklesIcon,
	UsersIcon,
} from "lucide-react";

import { BrandLogo } from "@/components/layout/brand-logo";

/**
 * What a visitor sees at `/` (spec 002, RN-01): what Quizio is, and how to
 * get in — as a creator (Entrar, Criar conta) or as a player with a PIN.
 * Every action is a real link, not a Base UI button: they navigate, and the
 * primitive would announce them as buttons.
 */
export function PublicLanding() {
	return (
		<div className="flex min-h-svh flex-col bg-background">
			<LandingHeader />
			<main className="flex flex-1 flex-col">
				<Hero />
				<HowItWorks />
				<Features />
				<JoinBand />
			</main>
			<footer className="border-border border-t bg-card">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-muted-foreground text-sm sm:flex-row">
					<BrandLogo className="font-black text-brand text-lg tracking-tight" />
					<p className="text-center">
						Quizzes ao vivo, sem paywalls e sem limite de participantes.
					</p>
					<nav aria-label="Documentos" className="flex gap-4">
						<Link to="/terms" className="hover:text-foreground hover:underline">
							Termos de Uso
						</Link>
						<Link
							to="/privacy"
							className="hover:text-foreground hover:underline"
						>
							Privacidade
						</Link>
					</nav>
				</div>
			</footer>
		</div>
	);
}

function LandingHeader() {
	return (
		<header className="sticky top-0 z-20 border-border border-b bg-card/90 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
				<Link to="/" className="font-black text-2xl text-brand tracking-tight">
					<BrandLogo nameClassName="max-[400px]:sr-only" />
				</Link>
				<nav aria-label="Acesso" className="flex items-center gap-2">
					<Link
						to="/join"
						className={cn(
							buttonVariants({ variant: "ghost" }),
							"hidden sm:inline-flex",
						)}
					>
						Jogar com PIN
					</Link>
					<Link
						to="/login"
						search={{ mode: "sign-in" }}
						className={buttonVariants({ variant: "outline" })}
					>
						Entrar
					</Link>
					<Link
						to="/login"
						search={{ mode: "sign-up" }}
						className={cn(
							buttonVariants({ variant: "brand" }),
							"hidden sm:inline-flex",
						)}
					>
						Criar conta
					</Link>
				</nav>
			</div>
		</header>
	);
}

/** Answer shapes floating behind the hero, as on a game's background. */
const FLOATING_SHAPES: {
	shape: AnswerShapeName;
	className: string;
}[] = [
	{ shape: "triangle", className: "top-10 left-[6%] size-16 rotate-12" },
	{ shape: "diamond", className: "top-[60%] left-[2%] size-12 -rotate-6" },
	{ shape: "circle", className: "bottom-8 left-[38%] size-10" },
	{ shape: "square", className: "top-6 right-[42%] size-8 rotate-12" },
	{ shape: "triangle", className: "right-[3%] bottom-10 size-14 -rotate-12" },
];

function Hero() {
	return (
		<section className="relative overflow-hidden bg-linear-to-br from-brand to-brand-strong text-white">
			{FLOATING_SHAPES.map(({ shape, className }) => (
				<AnswerShape
					key={className}
					shape={shape}
					className={cn("absolute text-white/10", className)}
				/>
			))}
			<div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
				<div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
					<span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 font-semibold text-sm">
						<SparklesIcon aria-hidden="true" className="size-4" />
						Grátis e sem limite de participantes
					</span>
					<h1 className="max-w-xl text-balance font-black text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
						Transforme qualquer aula num jogo ao vivo
					</h1>
					<p className="max-w-lg text-pretty text-lg text-white/85">
						Crie quizzes em minutos, jogue com a turma pelo celular de cada um e
						descubra na hora quem entendeu e quem precisa de ajuda.
					</p>
					<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
						<Link
							to="/login"
							search={{ mode: "sign-up" }}
							className={cn(
								buttonVariants({ variant: "success", size: "xl" }),
								"w-full sm:w-auto",
							)}
						>
							Criar conta grátis
						</Link>
						<Link
							to="/join"
							className={cn(
								buttonVariants({ variant: "game", size: "xl" }),
								"w-full sm:w-auto",
							)}
						>
							Jogar com PIN
						</Link>
					</div>
					<p className="text-sm text-white/75">
						Já tem uma conta?{" "}
						<Link
							to="/login"
							search={{ mode: "sign-in" }}
							className="font-bold text-white underline underline-offset-4 hover:no-underline"
						>
							Entrar
						</Link>
					</p>
				</div>
				<GamePreview />
			</div>
		</section>
	);
}

const PREVIEW_ANSWERS: { shape: AnswerShapeName; text: string }[] = [
	{ shape: "triangle", text: "Mercúrio" },
	{ shape: "diamond", text: "Vênus" },
	{ shape: "circle", text: "Terra" },
	{ shape: "square", text: "Marte" },
];

const PREVIEW_PLAYERS = ["fox", "panda", "unicorn", "robot", "frog"];

/** A drawing of a question on the big screen: decoration only. */
function GamePreview() {
	return (
		<div
			aria-hidden="true"
			className="mx-auto w-full max-w-md rounded-2xl bg-white/10 p-3 shadow-2xl ring-1 ring-white/20 motion-safe:animate-stage-in sm:p-4"
		>
			<div className="flex items-center justify-between px-1 pb-3 font-bold text-sm">
				<span className="rounded-full bg-white/15 px-3 py-1">PIN 482 913</span>
				<span className="flex size-10 items-center justify-center rounded-full bg-brand-strong font-black text-lg">
					18
				</span>
			</div>
			<div className="rounded-lg bg-white px-4 py-5 text-center font-bold text-foreground text-lg shadow-press-light">
				Qual planeta é conhecido como planeta vermelho?
			</div>
			<div className="flex items-center justify-center gap-1.5 py-4">
				{PREVIEW_PLAYERS.map((character, index) => (
					<img
						key={character}
						src={`/avatars/characters/${character}.svg`}
						alt=""
						style={{ animationDelay: `${300 + index * 120}ms` }}
						className="size-9 rounded-full bg-white/90 p-1 shadow-md motion-safe:animate-pop-in"
					/>
				))}
				<span className="ml-1 font-semibold text-sm text-white/80">
					+27 jogando
				</span>
			</div>
			<div className="grid grid-cols-2 gap-2">
				{PREVIEW_ANSWERS.map(({ shape, text }, index) => (
					<div
						key={shape}
						style={{ animationDelay: `${150 + index * 90}ms` }}
						className={cn(
							"flex h-14 items-center gap-2.5 rounded-md px-3 font-bold text-answer-foreground shadow-press-light motion-safe:animate-pop-in sm:h-16",
							ANSWER_COLOR_CLASSES[shape],
							shape !== "square" && "opacity-60",
						)}
					>
						<AnswerShape shape={shape} className="size-5" />
						{text}
					</div>
				))}
			</div>
		</div>
	);
}

const STEPS: { title: string; text: string }[] = [
	{
		title: "Crie",
		text: "Monte as perguntas no editor ou deixe o assistente de IA criá-las a partir de um tema ou de um PDF.",
	},
	{
		title: "Jogue",
		text: "Mostre o PIN no telão. Cada um entra pelo celular, sem instalar nada e sem criar conta.",
	},
	{
		title: "Acompanhe",
		text: "Os relatórios mostram as perguntas difíceis e quem precisa de ajuda, prontos ao fim do jogo.",
	},
];

function HowItWorks() {
	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
			<SectionTitle
				title="Como funciona"
				text="Do quiz pronto ao relatório em três passos."
			/>
			<ol className="mt-10 grid gap-4 md:grid-cols-3">
				{STEPS.map(({ title, text }, index) => (
					<li
						key={title}
						className="flex flex-col gap-3 rounded-xl bg-card p-6 shadow-press-light"
					>
						<span
							className={cn(
								"flex size-11 items-center justify-center rounded-lg font-black text-white text-xl",
								[
									ANSWER_COLOR_CLASSES.triangle,
									ANSWER_COLOR_CLASSES.diamond,
									ANSWER_COLOR_CLASSES.square,
								][index],
							)}
						>
							{index + 1}
						</span>
						<h3 className="font-black text-xl">{title}</h3>
						<p className="text-muted-foreground">{text}</p>
					</li>
				))}
			</ol>
		</section>
	);
}

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
	{
		icon: ListChecksIcon,
		title: "Cinco tipos de pergunta",
		text: "Quiz, verdadeiro ou falso, digite a resposta, controle deslizante e quebra-cabeça, com imagens e símbolos.",
	},
	{
		icon: CalendarClockIcon,
		title: "Ao vivo ou como tarefa",
		text: "Jogue com todos ao mesmo tempo ou atribua com prazo, para cada um responder no seu ritmo.",
	},
	{
		icon: BarChart3Icon,
		title: "Relatórios na hora",
		text: "Acertos por pergunta e por participante, sem planilha nem conta de cabeça.",
	},
	{
		icon: UsersIcon,
		title: "Grupos",
		text: "Reúna a turma, compartilhe quizzes, publique avisos e atribua tarefas num só lugar.",
	},
	{
		icon: PaletteIcon,
		title: "Temas",
		text: "Escolha o visual do jogo ou crie o seu, com suas cores, seu fundo e seu logo.",
	},
	{
		icon: BotIcon,
		title: "Assistente de IA",
		text: "Gere perguntas a partir de um assunto ou de um PDF, ou conecte seu agente de IA ao Quizio.",
	},
];

function Features() {
	return (
		<section className="border-border border-y bg-card">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
				<SectionTitle
					title="Tudo o que a aula precisa"
					text="Sem plano pago e sem recurso trancado."
				/>
				<ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
					{FEATURES.map(({ icon: Icon, title, text }) => (
						<li key={title} className="flex gap-4">
							<span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
								<Icon aria-hidden="true" className="size-5" />
							</span>
							<div className="flex flex-col gap-1">
								<h3 className="font-bold text-lg">{title}</h3>
								<p className="text-muted-foreground">{text}</p>
							</div>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

function JoinBand() {
	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
			<div className="flex flex-col items-center gap-6 rounded-2xl bg-linear-to-br from-brand to-brand-strong px-6 py-12 text-center text-white sm:px-12 md:flex-row md:justify-between md:text-left">
				<div className="flex flex-col gap-2">
					<h2 className="font-black text-3xl tracking-tight">
						Recebeu um PIN?
					</h2>
					<p className="text-lg text-white/85">
						Entre no jogo agora, só com um apelido.
					</p>
				</div>
				<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
					<Link
						to="/join"
						className={cn(
							buttonVariants({ variant: "game", size: "xl" }),
							"w-full sm:w-auto",
						)}
					>
						Jogar com PIN
					</Link>
					<Link
						to="/login"
						search={{ mode: "sign-up" }}
						className={cn(
							buttonVariants({ variant: "success", size: "xl" }),
							"w-full sm:w-auto",
						)}
					>
						Criar conta grátis
					</Link>
				</div>
			</div>
		</section>
	);
}

function SectionTitle({ title, text }: { title: string; text: string }) {
	return (
		<div className="flex flex-col items-center gap-2 text-center">
			<h2 className="font-black text-3xl tracking-tight sm:text-4xl">
				{title}
			</h2>
			<p className="text-lg text-muted-foreground">{text}</p>
		</div>
	);
}
