import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@quizio/ui/components/alert-dialog";
import {
	AnswerOption,
	type AnswerOptionState,
} from "@quizio/ui/components/answer-option";
import { ANSWER_SHAPES } from "@quizio/ui/components/answer-shape";
import { Badge } from "@quizio/ui/components/badge";
import { Button } from "@quizio/ui/components/button";
import { Checkbox } from "@quizio/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@quizio/ui/components/dialog";
import { Input } from "@quizio/ui/components/input";
import { Label } from "@quizio/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@quizio/ui/components/radio-group";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@quizio/ui/components/sheet";
import { Switch } from "@quizio/ui/components/switch";
import { TabNav, TabNavItem } from "@quizio/ui/components/tab-nav";
import { Textarea } from "@quizio/ui/components/textarea";
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
	"game",
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
	"Vale de Hinom",
	"Betânia",
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

			<Section title="Formulários">
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<Label htmlFor="ds-title">Título</Label>
						<Input id="ds-title" placeholder="Bom de Bíblia (Junho)" />
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="ds-description">Descrição</Label>
						<Textarea id="ds-description" placeholder="Atos 1 a 7" />
					</div>
					<div className="flex flex-col gap-2">
						<span className="font-medium text-sm">Visibilidade</span>
						<RadioGroup defaultValue="private" aria-label="Visibilidade">
							<Label className="flex items-center gap-2">
								<RadioGroupItem value="private" /> Privado
							</Label>
							<Label className="flex items-center gap-2">
								<RadioGroupItem value="unlisted" /> Não listado
							</Label>
						</RadioGroup>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="private">Privado</Badge>
						<Badge variant="unlisted">Não listado</Badge>
						<Badge variant="soon">Em breve</Badge>
						<Badge variant="draft">Rascunho</Badge>
						<Badge variant="published">Publicado</Badge>
						<Badge variant="unsaved">Alterações não salvas</Badge>
					</div>
				</div>
			</Section>

			<Section title="Abas de seção">
				<TabNav aria-label="Exemplo de seções">
					<TabNavItem current render={<span />}>
						Recentes
					</TabNavItem>
					<TabNavItem render={<span />}>Rascunhos</TabNavItem>
					<TabNavItem render={<span />}>Lixeira</TabNavItem>
				</TabNav>
			</Section>

			<Section title="Diálogos">
				<div className="flex flex-wrap gap-3">
					<Dialog>
						<DialogTrigger render={<Button variant="outline" />}>
							Abrir diálogo
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Configurações do quiz</DialogTitle>
								<DialogDescription>
									Título, descrição, capa e visibilidade.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button>Salvar</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<AlertDialog>
						<AlertDialogTrigger render={<Button variant="destructive" />}>
							Excluir definitivamente
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Excluir o quiz para sempre?</AlertDialogTitle>
								<AlertDialogDescription>
									Esta ação não pode ser desfeita.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<AlertDialogAction variant="destructive">
									Excluir
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
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
				{/* Verdadeiro ou falso: blue diamond first, then red triangle (spec 005). */}
				<div className="grid gap-3 sm:grid-cols-2">
					<AnswerOption shape="diamond" size="lg">
						Verdadeiro
					</AnswerOption>
					<AnswerOption shape="triangle" size="lg">
						Falso
					</AnswerOption>
				</div>
				<div className="flex items-center gap-3 rounded-md bg-answer-blue p-3">
					<Checkbox variant="answer" aria-label="Correta (desmarcada)" />
					<Checkbox
						variant="answer"
						defaultChecked
						aria-label="Correta (marcada)"
					/>
					<span className="font-bold text-answer-foreground">
						Checkbox variant="answer"
					</span>
				</div>
			</Section>

			<Section title="Chave e painel lateral">
				<div className="flex flex-wrap items-center gap-6">
					<Label className="flex items-center gap-2">
						<Switch defaultChecked />
						Ligada
					</Label>
					<Label className="flex items-center gap-2">
						<Switch />
						Desligada
					</Label>
					<Label className="flex items-center gap-2">
						<Switch size="sm" defaultChecked />
						Pequena
					</Label>
					<Label className="flex items-center gap-2">
						<Switch disabled />
						Desabilitada
					</Label>
				</div>
				<Sheet>
					<SheetTrigger render={<Button variant="outline" />}>
						Abrir painel lateral
					</SheetTrigger>
					<SheetContent>
						<SheetHeader>
							<SheetTitle>Painel lateral</SheetTitle>
							<SheetDescription>
								Fica preso à lateral, por cima da página.
							</SheetDescription>
						</SheetHeader>
						<SheetBody>
							<Label className="flex items-center justify-between gap-4">
								Uma opção
								<Switch />
							</Label>
						</SheetBody>
						<SheetFooter>Rodapé do painel</SheetFooter>
					</SheetContent>
				</Sheet>
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
