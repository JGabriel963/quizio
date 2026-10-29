import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@quizio/ui/components/alert-dialog";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { ChevronLeftIcon, XIcon } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";

import type {
	AssistantStatusData,
	GeneratedQuestionData,
	GenerationResultData,
} from "@/lib/api-types";
import { assistantEstimate } from "@/lib/assistant-credits";
import {
	estimateLabel,
	GENERATION_FAILED_MESSAGE,
	nextAvailableMessage,
	notEnoughCreditsReason,
	TOPIC_SUGGESTIONS,
} from "@/lib/assistant-labels";
import {
	type AssistantSource,
	type AssistantState,
	assistantReducer,
	checkedQuestions,
	createIntent,
	type GenerationRequest,
	initialAssistantState,
} from "@/lib/assistant-state";
import {
	openPdf as openPdfInBrowser,
	type PdfDocumentHandle,
} from "@/lib/pdf-document";
import { isDomainRefusal, quizErrorMessage } from "@/lib/quiz-error-messages";

import { AiBadge } from "./ai-badge";
import { ExtractOrGenerateStep } from "./extract-or-generate-step";
import { GeneratedQuestions } from "./generated-questions";
import { OptionsPanel } from "./options-panel";
import { PdfPagesStep } from "./pdf-pages-step";
import { PdfUploadStep } from "./pdf-upload-step";
import { SourceBar } from "./source-bar";

/** What the assistant asks of the API; the editor's route wires it to tRPC. */
export interface QuizAssistantActions {
	generate: (request: GenerationRequest) => Promise<GenerationResultData>;
	uploadSource: (
		file: File,
		onProgress: (fraction: number) => void,
	) => Promise<string>;
	discardSource: (key: string) => void;
	/** Resolves true once the questions are in the quiz. */
	add: (questions: GeneratedQuestionData[]) => Promise<boolean>;
}

export interface QuizAssistantProps {
	open: boolean;
	initialSource: AssistantSource;
	status: AssistantStatusData;
	/** The quiz's questions, for the 200 limit (RN-27). */
	questionCount: number;
	actions: QuizAssistantActions;
	onClose: () => void;
	openPdf?: (data: Uint8Array) => Promise<PdfDocumentHandle>;
}

const CREATING_REASON = "Criando suas perguntas…";
const NO_PAGES_REASON = "Escolha as páginas do arquivo.";

/**
 * "Crie com o Assistente" (spec 027): the source, the options, the wait and
 * the created questions to review and add, over the editor.
 */
export function QuizAssistant({
	open,
	initialSource,
	status,
	questionCount,
	actions,
	onClose,
	openPdf = openPdfInBrowser,
}: QuizAssistantProps) {
	const [state, dispatch] = useReducer(
		assistantReducer,
		{ options: status.options, source: initialSource },
		initialAssistantState,
	);
	const [adding, setAdding] = useState(false);
	const documentRef = useRef<PdfDocumentHandle | null>(null);
	const finished = useRef(false);

	/** Leaves: the PDF goes with the assistant (RN-18). */
	const finish = () => {
		if (finished.current) {
			return;
		}
		finished.current = true;
		if (state.pdf) {
			actions.discardSource(state.pdf.key);
		}
		void documentRef.current?.destroy();
		onClose();
	};

	useEffect(() => {
		if (state.closing) {
			finish();
		}
	});

	const generating = state.generation.status === "generating";
	const quotaReason =
		status.remaining > 0
			? null
			: status.nextAvailableAt
				? nextAvailableMessage(status.limit, status.nextAvailableAt)
				: `Você usou os ${status.limit} créditos das últimas 24 horas.`;
	// The same estimate the server reserves (spec 045, RN-06, RN-08).
	const estimate = assistantEstimate(state, status.pricing);
	const notEnoughReason =
		estimate && !quotaReason && estimate.credits > status.remaining
			? notEnoughCreditsReason(estimate.credits, status.remaining)
			: null;
	const creditsReason = quotaReason ?? notEnoughReason;
	const creditsNote =
		notEnoughReason ?? (estimate ? estimateLabel(estimate.credits) : null);
	const createDisabledReason =
		creditsReason ??
		(generating ? CREATING_REASON : null) ??
		(state.source === "pdf" && state.pdf && state.pages.length === 0
			? NO_PAGES_REASON
			: null);

	async function create(from: AssistantState, confirmed = false) {
		// The panel and the pages screen say why; the server would refuse anyway.
		if (creditsReason || generating) {
			return;
		}
		const intent = createIntent(from, { confirmed });
		switch (intent.kind) {
			case "none":
				return;
			case "confirmReplace":
				dispatch({ type: "confirmAsked", confirm: "replace" });
				return;
			case "askExtract":
				dispatch({ type: "extractAsked" });
				return;
			case "generate":
				dispatch({ type: "generationStarted", request: intent.request });
				try {
					const result = await actions.generate(intent.request);
					dispatch({ type: "generationSucceeded", result });
				} catch (error) {
					dispatch({
						type: "generationFailed",
						message: isDomainRefusal(error)
							? quizErrorMessage(error)
							: GENERATION_FAILED_MESSAGE,
					});
				}
		}
	}

	/** Runs an event, then Crie on the state it leads to. */
	const createAfter = (event: Parameters<typeof assistantReducer>[1]) => {
		const next = assistantReducer(state, event);
		dispatch(event);
		void create(next);
	};

	async function add(questions: GeneratedQuestionData[]) {
		setAdding(true);
		const added = await actions.add(questions);
		setAdding(false);
		if (added) {
			finish();
		}
	}

	const replacePdf = (key: string | null) => {
		if (state.pdf && state.pdf.key !== key) {
			actions.discardSource(state.pdf.key);
		}
	};

	const generation = state.generation;
	const allQuestions = generation.status === "done" ? generation.questions : [];

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => !next && dispatch({ type: "closeRequested" })}
		>
			<DialogContent size="screen" showCloseButton={false} className="p-0">
				<header className="flex items-center gap-2 border-border border-b px-3 py-2 sm:px-4">
					{state.step !== "main" && (
						<Button
							variant="secondary"
							size="icon-sm"
							aria-label="Voltar"
							onClick={() => dispatch({ type: "backRequested" })}
						>
							<ChevronLeftIcon />
						</Button>
					)}
					<DialogTitle className="flex-1 text-base sm:text-lg">
						Crie com o{" "}
						<span className="bg-linear-to-r from-primary to-brand bg-clip-text text-transparent">
							Assistente
						</span>
					</DialogTitle>
					<AiBadge />
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Fechar"
						onClick={() => dispatch({ type: "closeRequested" })}
					>
						<XIcon />
					</Button>
				</header>

				<div className="flex min-h-0 flex-1 max-lg:flex-col">
					<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/50">
						{state.step === "pdfUpload" && (
							<>
								{state.pdf && (
									<p className="flex items-center justify-center gap-2 border-border border-b bg-card p-2 text-sm">
										{state.pdf.name}
										<Button
											variant="link"
											size="sm"
											onClick={() => dispatch({ type: "pdfPagesReopened" })}
										>
											Continuar com este arquivo
										</Button>
									</p>
								)}
								<PdfUploadStep
									openPdf={openPdf}
									uploadSource={actions.uploadSource}
									onLoaded={(pdf, document) => {
										replacePdf(pdf.key);
										void documentRef.current?.destroy();
										documentRef.current = document;
										dispatch({ type: "pdfLoaded", pdf });
									}}
								/>
							</>
						)}
						{state.step === "pdfPages" && documentRef.current && (
							<PdfPagesStep
								document={documentRef.current}
								pages={state.pages}
								extract={state.options.format === "extract"}
								createDisabledReason={creditsReason}
								creditsNote={creditsNote}
								onTogglePage={(page) => dispatch({ type: "pageToggled", page })}
								onSelectAll={() => dispatch({ type: "allPagesSelected" })}
								onExtractChange={(extract) =>
									dispatch({ type: "extractToggled", extract })
								}
								onCreate={() => void create(state)}
							/>
						)}
						{state.step === "extractOrGenerate" && (
							<ExtractOrGenerateStep
								onChoose={(extract) =>
									createAfter({ type: "extractChosen", extract })
								}
							/>
						)}
						{state.step === "main" && (
							<>
								<SourceBar
									source={state.source}
									topic={state.topic}
									pdfName={state.pdf?.name ?? null}
									createDisabledReason={createDisabledReason}
									creditsNote={creditsNote}
									busy={generating}
									layout={state.layout}
									onSourceChange={(source) =>
										dispatch({ type: "sourceChanged", source })
									}
									onTopicChange={(topic) =>
										dispatch({ type: "topicChanged", topic })
									}
									onUpload={() => dispatch({ type: "uploadOpened" })}
									onRemovePdf={() => {
										replacePdf(null);
										void documentRef.current?.destroy();
										documentRef.current = null;
										dispatch({ type: "pdfRemoved" });
									}}
									onCreate={() => void create(state)}
									onLayoutChange={(layout) =>
										dispatch({ type: "layoutChanged", layout })
									}
								/>
								{state.source === "topic" &&
									state.generation.status === "idle" && (
										<TopicSuggestions
											onPick={(topic) =>
												dispatch({ type: "topicChanged", topic })
											}
										/>
									)}
								<div className="min-h-0 flex-1 overflow-y-auto">
									<GeneratedQuestions
										generation={state.generation}
										checked={state.checked}
										layout={state.layout}
										onToggle={(id) => dispatch({ type: "questionToggled", id })}
									/>
								</div>
							</>
						)}
					</div>

					{state.step === "main" && (
						<aside
							aria-label="Opções da criação"
							className="flex w-72 shrink-0 flex-col border-border border-l bg-card max-lg:max-h-[60svh] max-lg:w-full max-lg:border-t max-lg:border-l-0"
						>
							<OptionsPanel
								source={state.source}
								options={state.options}
								remaining={status.remaining}
								checkedCount={state.checked.length}
								totalCount={allQuestions.length}
								questionCount={questionCount}
								busy={generating || adding}
								onChange={(options) =>
									dispatch({ type: "optionsChanged", options })
								}
								onAdd={() => void add(checkedQuestions(state))}
								onAddAll={() => void add(allQuestions)}
							/>
						</aside>
					)}
				</div>

				<ConfirmDialog
					open={state.confirm === "replace"}
					title="Substituir as perguntas criadas?"
					description="As perguntas marcadas e não adicionadas serão descartadas."
					action="Substituir"
					onCancel={() => dispatch({ type: "confirmCancelled" })}
					onConfirm={() => void create(state, true)}
				/>
				<ConfirmDialog
					open={state.confirm === "close"}
					title="Descartar as perguntas criadas?"
					description="As perguntas que você não adicionou ao quiz serão perdidas."
					action="Descartar"
					onCancel={() => dispatch({ type: "confirmCancelled" })}
					onConfirm={finish}
				/>
			</DialogContent>
		</Dialog>
	);
}

/** Example topics: one fills the field, nothing is created yet (RN-06). */
function TopicSuggestions({ onPick }: { onPick: (topic: string) => void }) {
	return (
		<ul
			aria-label="Sugestões de assunto"
			className="flex gap-2 overflow-x-auto border-border border-b bg-card px-3 pb-3 sm:px-4"
		>
			{TOPIC_SUGGESTIONS.map((topic) => (
				<li key={topic} className="shrink-0">
					<Button variant="outline" size="sm" onClick={() => onPick(topic)}>
						{topic}
					</Button>
				</li>
			))}
		</ul>
	);
}

function ConfirmDialog({
	open,
	title,
	description,
	action,
	onCancel,
	onConfirm,
}: {
	open: boolean;
	title: string;
	description: string;
	action: string;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						{action}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
