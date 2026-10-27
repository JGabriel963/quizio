import type { Question } from "@quizio/core/quiz/domain/question";
import { quizPublishState } from "@quizio/core/quiz/domain/quiz";
import { displayQuizTitle } from "@quizio/core/quiz/domain/quiz-details";
import { Button, buttonVariants } from "@quizio/ui/components/button";
import { Skeleton } from "@quizio/ui/components/skeleton";
import { cn } from "@quizio/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	ChevronRightIcon,
	CopyIcon,
	EyeIcon,
	EyeOffIcon,
	FileTextIcon,
	LayoutGridIcon,
	ListIcon,
	MonitorPlayIcon,
	PencilIcon,
	PlayIcon,
	RectangleHorizontalIcon,
	SendIcon,
	SettingsIcon,
	Trash2Icon,
	UserIcon,
} from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { UserAvatar } from "@/components/groups/user-avatar";
import type { QuizDetailsData, ReportListItemData } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { questionCountLabel } from "@/lib/quiz-labels";
import { timeUntil } from "@/lib/time-until";

import { QuizCover } from "./quiz-cover";
import {
	type QuestionPreviewLayout,
	QuizQuestionPreview,
} from "./quiz-question-preview";
import { QuizStatusBadge } from "./quiz-status-badge";
import { VISIBILITY_LABELS, VisibilityBadge } from "./visibility-badge";

export interface QuizDetailsActions {
	/** "Organizar ao vivo": opens a live game of the quiz (spec 008). */
	onHost: () => void;
	/** "Atribuir": opens "Configurar atividade" (spec 029, RN-02). */
	onAssign: () => void;
	onEdit: () => void;
	onDuplicate: () => void;
	onMoveToTrash: () => void;
	onRestore: () => void;
	onDeletePermanently: () => void;
}

/** "Perguntas (N)": the live questions, with their images' URLs. */
export interface QuizPreviewData {
	questions: readonly Question[];
	imageUrls: Readonly<Record<string, string>>;
}

/** The games played with the quiz, from its reports. */
export interface QuizActivityData {
	games: number;
	participants: number;
	/** "Atividades": the assignments still open. */
	openAssignments: readonly ReportListItemData[];
}

/**
 * The quiz's page, laid out as Kahoot's: a bar with the owner and the
 * actions, the quiz with its numbers, the open activities and the questions,
 * and "Sessão do quiz" on the side. The same view fills the page and the
 * library's drawer, which puts its arrows and its close in `navigation`.
 */
export function QuizDetailsView({
	quiz,
	actions,
	owner,
	preview,
	activity,
	navigation,
	now = new Date(),
}: {
	quiz: QuizDetailsData;
	actions: QuizDetailsActions;
	owner?: { userId: string; name: string };
	/** Undefined while it loads. */
	preview?: QuizPreviewData;
	activity?: QuizActivityData;
	navigation?: ReactNode;
	now?: Date;
}) {
	const hostHintId = useId();
	const inTrash = quiz.trashedAt !== null;
	const playable = quiz.status === "published";
	// What is said next to "Organizar ao vivo" (spec 008, RN-02, RN-05).
	const hostHint = !playable
		? "Salve o quiz no editor para poder jogar."
		: quiz.hasUnpublishedChanges
			? "A partida usa a última versão salva."
			: null;
	const describedBy = hostHint ? hostHintId : undefined;

	// One grid for every width, laid out as Kahoot's: on a phone the actions
	// go under "Sessão do quiz" and the details close the page; from `lg` the
	// actions sit in the top bar and the session and details in a side column.
	return (
		<article className="grid min-h-full grid-cols-1 content-start bg-card lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-10 lg:px-10 xl:grid-cols-[minmax(0,1fr)_22rem] xl:px-16">
			<div className="col-span-full row-start-1 flex items-center justify-between gap-3 border-border border-b bg-card px-4 py-2 max-lg:sticky max-lg:top-0 max-lg:z-10 sm:px-6 lg:-mx-10 xl:-mx-16">
				<p className="flex min-w-0 items-center gap-2 font-semibold text-sm">
					{owner && (
						<>
							<UserAvatar userId={owner.userId} size="md" />
							<span className="truncate">{owner.name}</span>
						</>
					)}
				</p>
				{navigation}
			</div>

			<div className="flex min-w-0 flex-col gap-6 px-4 pt-5 sm:px-6 lg:col-start-1 lg:row-start-2 lg:px-0 lg:pt-6">
				{inTrash && (
					<p
						role="status"
						className="rounded-md bg-muted px-4 py-3 font-semibold text-sm"
					>
						Este quiz está na lixeira.
					</p>
				)}

				<div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-x-5">
					<QuizCover url={quiz.coverImageUrl} className="sm:row-span-2" />
					<div className="flex min-w-0 flex-col gap-1">
						<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
							<span className="inline-flex items-center gap-1">
								<FileTextIcon aria-hidden="true" className="size-4" />
								Quiz
							</span>
							<QuizStatusBadge state={quizPublishState(quiz)} />
							<VisibilityBadge visibility={quiz.visibility} />
						</div>
						<h1 className="break-words font-bold text-xl sm:text-3xl">
							{displayQuizTitle(quiz.title)}
						</h1>
					</div>
					<div className="col-span-full flex flex-col gap-3 sm:col-span-1 sm:col-start-2">
						{quiz.description && (
							<p className="whitespace-pre-line text-sm">{quiz.description}</p>
						)}
						<p className="flex flex-wrap gap-4 text-muted-foreground text-sm">
							<span className="font-semibold text-foreground">
								{questionCountLabel(quiz.questionCount)}
							</span>
							{activity && (
								<>
									<span className="inline-flex items-center gap-1">
										<PlayIcon aria-hidden="true" className="size-4" />
										<span className="font-semibold text-foreground">
											{activity.games}
										</span>
										{activity.games === 1 ? "jogo" : "jogos"}
									</span>
									<span className="inline-flex items-center gap-1">
										<UserIcon aria-hidden="true" className="size-4" />
										<span className="font-semibold text-foreground">
											{activity.participants}
										</span>
										{activity.participants === 1
											? "participante"
											: "participantes"}
									</span>
								</>
							)}
						</p>
					</div>
				</div>

				{activity && activity.openAssignments.length > 0 && (
					<OpenAssignments assignments={activity.openAssignments} />
				)}
			</div>

			<section
				aria-label="Sessão do quiz"
				className="flex flex-col gap-2 px-4 pt-6 sm:px-6 lg:col-start-2 lg:row-start-2 lg:px-0"
			>
				<h2 className="font-bold text-sm lg:text-base">
					{inTrash ? "Quiz na lixeira" : "Sessão do quiz"}
				</h2>
				{inTrash ? (
					<div className="flex flex-col gap-2">
						<Button size="lg" onClick={actions.onRestore}>
							Restaurar
						</Button>
						<Button
							size="lg"
							variant="destructive"
							onClick={actions.onDeletePermanently}
						>
							Excluir definitivamente
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
						<Button
							size="lg"
							className={SESSION_BUTTON}
							disabled={!playable}
							aria-describedby={describedBy}
							onClick={actions.onHost}
						>
							<span className={SESSION_LABEL}>
								<MonitorPlayIcon aria-hidden="true" className="size-6" />
								Organizar ao vivo
							</span>
							<ChevronRightIcon aria-hidden="true" className="max-lg:hidden" />
						</Button>
						{/* The same conditions as the live game (spec 029, RN-03). */}
						<Button
							size="lg"
							variant="secondary"
							className={SESSION_BUTTON}
							disabled={!playable}
							aria-describedby={describedBy}
							onClick={actions.onAssign}
						>
							<span className={SESSION_LABEL}>
								<SendIcon aria-hidden="true" className="size-6" />
								Atribuir
							</span>
							<ChevronRightIcon aria-hidden="true" className="max-lg:hidden" />
						</Button>
					</div>
				)}
				{!inTrash && hostHint && (
					<p id={hostHintId} className="text-muted-foreground text-sm">
						{hostHint}
					</p>
				)}
			</section>

			{/* Kahoot's Editar, Favorito, Compart. and Opções: in the top bar from
			    `lg` (laid over it, centered), a row of icons on a phone. */}
			{!inTrash && (
				<div className="grid grid-cols-4 gap-1 px-4 pt-5 sm:px-6 lg:relative lg:col-span-full lg:row-start-1 lg:flex lg:self-center lg:justify-self-center lg:p-0">
					{/* The editor holds the questions (spec 003, RN-05). */}
					<Link
						to="/creator/$quizId"
						params={{ quizId: quiz.id }}
						className={cn(buttonVariants({ variant: "ghost" }), QUIZ_ACTION)}
					>
						<PencilIcon data-icon="inline-start" />
						Editar
					</Link>
					<Button
						variant="ghost"
						className={QUIZ_ACTION}
						onClick={actions.onEdit}
					>
						<SettingsIcon data-icon="inline-start" />
						Editar dados
					</Button>
					<Button
						variant="ghost"
						className={QUIZ_ACTION}
						onClick={actions.onDuplicate}
					>
						<CopyIcon data-icon="inline-start" />
						Duplicar
					</Button>
					<Button
						variant="ghost"
						className={QUIZ_ACTION}
						onClick={actions.onMoveToTrash}
					>
						<Trash2Icon data-icon="inline-start" />
						Mover para a lixeira
					</Button>
				</div>
			)}

			<div className="min-w-0 px-4 pt-6 sm:px-6 lg:col-start-1 lg:row-start-3 lg:px-0 lg:pt-8 lg:pb-8">
				<QuestionsSection quiz={quiz} preview={preview} />
			</div>

			<section
				aria-labelledby="quiz-details"
				className="flex flex-col gap-1 px-4 py-6 text-muted-foreground text-xs sm:px-6 lg:col-start-2 lg:row-start-3 lg:self-start lg:px-0 lg:pt-4 lg:text-center"
			>
				<h2
					id="quiz-details"
					className="pb-1 font-bold text-base text-foreground lg:sr-only"
				>
					Detalhes
				</h2>
				{/* Whether there is something to play, and since when (spec 006, RN-31). */}
				<p>
					{quiz.publishedAt
						? `Versão jogável salva ${formatRelativeTime(new Date(quiz.publishedAt), now)}`
						: "Ainda não foi salvo como jogável"}
				</p>
				<p>
					<span>
						Última modificação:{" "}
						{formatRelativeTime(new Date(quiz.updatedAt), now)}
					</span>
					{" · "}
					<span>Visibilidade: {VISIBILITY_LABELS[quiz.visibility]}</span>
				</p>
			</section>
		</article>
	);
}

/** On a phone, a tile with the icon over the label; from `lg`, a wide row. */
const SESSION_BUTTON =
	"h-auto flex-col justify-center gap-1 py-3 text-sm lg:h-14 lg:flex-row lg:justify-between lg:py-0 lg:text-base";
const SESSION_LABEL =
	"inline-flex flex-col items-center gap-1 lg:flex-row lg:gap-3 lg:[&>svg]:size-5";
/** On a phone, the icon over a small label, as Kahoot's row of actions. */
const QUIZ_ACTION =
	"max-lg:h-auto max-lg:flex-col max-lg:gap-1 max-lg:px-1 max-lg:py-2 max-lg:font-normal max-lg:text-muted-foreground max-lg:text-xs max-lg:whitespace-normal max-lg:text-center";

/** "Atividades": the assignments still open, each to its report. */
function OpenAssignments({
	assignments,
}: {
	assignments: readonly ReportListItemData[];
}) {
	return (
		<section aria-labelledby="quiz-activities" className="flex flex-col gap-3">
			<h2 id="quiz-activities" className="font-bold text-lg">
				Atividades
			</h2>
			<ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
				{assignments.map((assignment) => (
					<li key={assignment.gameId}>
						<Link
							to="/reports/$gameId"
							params={{ gameId: assignment.gameId }}
							className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 shadow-xs hover:bg-muted"
						>
							<span
								aria-hidden="true"
								className="size-2.5 shrink-0 rounded-full bg-primary"
							/>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate font-semibold text-sm">
									{assignment.name}
								</span>
								{assignment.remainingMs !== null && (
									<span className="text-muted-foreground text-xs">
										Termina: {timeUntil(assignment.remainingMs)}
									</span>
								)}
							</span>
							<span className="inline-flex items-center gap-1 text-sm">
								<UserIcon aria-hidden="true" className="size-4" />
								<span className="sr-only">Participantes:</span>
								{assignment.participantCount}
							</span>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}

const LAYOUT_BUTTONS = [
	{
		layout: "large",
		label: "Perguntas grandes",
		icon: RectangleHorizontalIcon,
	},
	{ layout: "grid", label: "Grade de perguntas", icon: LayoutGridIcon },
	{ layout: "list", label: "Lista de perguntas", icon: ListIcon },
] as const satisfies readonly {
	layout: QuestionPreviewLayout;
	label: string;
	icon: unknown;
}[];

function QuestionsSection({
	quiz,
	preview,
}: {
	quiz: QuizDetailsData;
	preview: QuizPreviewData | undefined;
}) {
	const [showAnswers, setShowAnswers] = useState(false);
	const [layout, setLayout] = useState<QuestionPreviewLayout>("grid");
	const count = preview?.questions.length ?? quiz.questionCount;

	return (
		<section aria-labelledby="quiz-questions" className="flex flex-col gap-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<h2 id="quiz-questions" className="font-bold text-lg">
					Perguntas ({count})
				</h2>
				<div className="flex items-center gap-2 self-end sm:self-auto">
					<Button
						variant="ghost"
						aria-pressed={showAnswers}
						onClick={() => setShowAnswers((shown) => !shown)}
					>
						{showAnswers ? (
							<EyeOffIcon data-icon="inline-start" />
						) : (
							<EyeIcon data-icon="inline-start" />
						)}
						{showAnswers ? "Ocultar respostas" : "Mostrar respostas"}
					</Button>
					{/* biome-ignore lint/a11y/useSemanticElements: a group of toggle buttons, not a form fieldset. */}
					<div
						role="group"
						aria-label="Exibição das perguntas"
						className="flex overflow-hidden rounded-md border border-border"
					>
						{LAYOUT_BUTTONS.map(({ layout: option, label, icon: Icon }) => (
							<button
								key={option}
								type="button"
								aria-label={label}
								aria-pressed={layout === option}
								onClick={() => setLayout(option)}
								className={cn(
									"flex size-9 items-center justify-center border-border not-first:border-l hover:bg-muted",
									// A phone has room for one column: the grid is the big slides there.
									option === "large" && "max-md:hidden",
									option === "grid" && "max-md:border-l-0",
									layout === option && "bg-muted text-foreground",
									layout !== option && "text-muted-foreground",
								)}
							>
								<Icon aria-hidden="true" className="size-4" />
							</button>
						))}
					</div>
				</div>
			</div>
			{preview === undefined ? (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					<Skeleton className="h-72" />
					<Skeleton className="h-72" />
				</div>
			) : preview.questions.length === 0 ? (
				<p className="rounded-md bg-muted px-4 py-6 text-center text-muted-foreground text-sm">
					Este quiz ainda não tem perguntas.
				</p>
			) : (
				<QuizQuestionPreview
					questions={preview.questions}
					imageUrls={preview.imageUrls}
					layout={layout}
					showAnswers={showAnswers}
				/>
			)}
		</section>
	);
}
