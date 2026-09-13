import {
	AnswerOption,
	type AnswerOptionState,
} from "@quizio/ui/components/answer-option";
import { ANSWER_SHAPES } from "@quizio/ui/components/answer-shape";
import { Button } from "@quizio/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

export const Route = createFileRoute("/design-system")({
	component: DesignSystemPage,
});

const colorTokens = [
	{ name: "brand", className: "bg-brand" },
	{ name: "brand-strong", className: "bg-brand-strong" },
	{ name: "primary", className: "bg-primary" },
	{ name: "success", className: "bg-success" },
	{ name: "destructive", className: "bg-destructive" },
	{ name: "answer-red", className: "bg-answer-red" },
	{ name: "answer-blue", className: "bg-answer-blue" },
	{ name: "answer-yellow", className: "bg-answer-yellow" },
	{ name: "answer-green", className: "bg-answer-green" },
] as const;

const buttonVariants = [
	"default",
	"brand",
	"success",
	"destructive",
	"secondary",
	"outline",
	"ghost",
	"link",
] as const;
const buttonSizes = ["xs", "sm", "default", "lg", "xl"] as const;

const sampleAnswers = [
	"Campo de sangue",
	"Campo do oleiro",
	"Getsêmani",
	"Monte das Oliveiras",
];
const answerStates: AnswerOptionState[] = [
	"idle",
	"selected",
	"correct",
	"incorrect",
];

function DesignSystemPage() {
	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8">
			<header className="flex flex-col gap-1">
				<h1 className="font-extrabold text-3xl text-brand">Design system</h1>
				<p className="text-muted-foreground">
					Tokens e componentes do Quizio, inspirados na interface do Kahoot.
				</p>
			</header>

			<Section title="Cores">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
					{colorTokens.map((token) => (
						<div
							key={token.name}
							className="overflow-hidden rounded-md bg-card shadow-sm"
						>
							<div className={`h-14 ${token.className}`} />
							<p className="px-2 py-1.5 font-semibold text-xs">{token.name}</p>
						</div>
					))}
				</div>
			</Section>

			<Section title="Botões">
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-3">
						{buttonVariants.map((variant) => (
							<Button key={variant} variant={variant}>
								{variant}
							</Button>
						))}
					</div>
					<div className="flex flex-wrap items-center gap-3">
						{buttonSizes.map((size) => (
							<Button key={size} size={size}>
								<PlusIcon data-icon="inline-start" />
								Crie ({size})
							</Button>
						))}
					</div>
				</div>
			</Section>

			<Section title="Alternativas de resposta">
				<div className="grid gap-3 sm:grid-cols-2">
					{ANSWER_SHAPES.map((shape, index) => (
						<AnswerOption key={shape} shape={shape} size="lg">
							{sampleAnswers[index]}
						</AnswerOption>
					))}
				</div>
				<div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
					{answerStates.map((state, index) => (
						<AnswerOption
							key={state}
							shape={ANSWER_SHAPES[index] ?? "triangle"}
							state={state}
						>
							{state}
						</AnswerOption>
					))}
				</div>
			</Section>
		</main>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-sm">
			<h2 className="font-bold text-lg">{title}</h2>
			{children}
		</section>
	);
}
