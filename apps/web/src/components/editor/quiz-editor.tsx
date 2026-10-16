import {
	isBlankQuestion,
	type QuestionType,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import { incompleteQuestions } from "@quizio/core/quiz/domain/question-issues";
import { useState } from "react";

import type {
	AssistantStatusData,
	GeneratedQuestionData,
	QuestionData,
	QuizEditorData,
} from "@/lib/api-types";
import type { AssistantActions } from "@/lib/assistant-mutations";
import type { AssistantSource } from "@/lib/assistant-state";
import {
	imageUrlOf,
	publishStateOf,
	selectionAfterRemoval,
} from "@/lib/editor-cache";

import { NewQuizDialog } from "./assistant/new-quiz-dialog";
import { QuizAssistant } from "./assistant/quiz-assistant";
import { DeleteQuestionDialog } from "./delete-question-dialog";
import { EditorHeader, type ExitDestination } from "./editor-header";
import {
	type FinishingTouches,
	FinishingTouchesDialog,
} from "./finishing-touches-dialog";
import { IncompleteQuestionsDialog } from "./incomplete-questions-dialog";
import { QuestionCanvas } from "./question-canvas";
import { QUESTION_IMAGE_FALLBACK_ALT } from "./question-image-view";
import { QuestionList } from "./question-list";
import { type ImageUploadState, NO_UPLOAD } from "./question-media";
import { QuestionPropertiesMenu } from "./question-properties-menu";
import { QuestionPropertiesPanel } from "./question-properties-panel";
import { QuizReadyDialog } from "./quiz-ready-dialog";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";

export const PUBLISHED_QUIZ_NEEDS_TITLE = "Um quiz publicado precisa de título";

export interface PlacedQuestionData {
	question: QuestionData;
	index: number;
}

/** What the editor asks of the API; the route wires it to tRPC (specs 003 to 006). */
export interface EditorActions {
	/**
	 * The editor data as it is right now. The handlers that run after a save
	 * read it here: the `data` they closed over may be one render behind.
	 */
	current: () => QuizEditorData | undefined;
	/**
	 * Salvar: freezes the playable version (spec 006). Resolves null when the
	 * quiz was published, or the message of why it was not.
	 */
	publish: (touches?: FinishingTouches) => Promise<string | null>;
	/** "Descartar": resolves null once the questions are the playable version's again. */
	discardChanges: () => Promise<string | null>;
	saveTitle: (title: string | null) => Promise<unknown>;
	/** Autosaved text fields (question and answers); rejects when it fails. */
	saveQuestionField: (
		questionId: string,
		change: QuestionChange,
	) => Promise<unknown>;
	/** Changes saved at once (corrects, time, points...), tracked by the action. */
	changeQuestion: (questionId: string, change: QuestionChange) => void;
	/**
	 * Sends the file and puts it on the question (spec 007). Resolves null, or
	 * the message of why the image was not added.
	 */
	uploadQuestionImage: (
		questionId: string,
		file: File,
		onProgress: (fraction: number) => void,
	) => Promise<string | null>;
	/** Keeps the question and swaps its answers for the other type's (spec 005). */
	changeQuestionType: (questionId: string, type: QuestionType) => void;
	applyTimeLimitToAll: (seconds: QuestionData["timeLimitSeconds"]) => void;
	/** Resolves the new question, or null when the server refused it. */
	addQuestion: (
		afterQuestionId: string,
		type: QuestionType,
	) => Promise<PlacedQuestionData | null>;
	duplicateQuestion: (questionId: string) => Promise<PlacedQuestionData | null>;
	/**
	 * Adds the creation assistant's questions (spec 027, RN-26) and resolves the
	 * id of the first one, or null when the server refused them.
	 */
	addGeneratedQuestions: (
		questions: GeneratedQuestionData[],
	) => Promise<string | null>;
	moveQuestion: (questionId: string, toIndex: number) => void;
	deleteQuestion: (questionId: string) => void;
}

/** The creation assistant, when the instance has one (spec 027, RN-01). */
export interface EditorAssistant extends AssistantActions {
	status: AssistantStatusData;
	/** The quiz was just created: "Criar um novo quiz" opens over it (RN-03). */
	offerNewQuiz: boolean;
}

/**
 * Full-screen editor (spec 003, RN-06): header, question list, the selected
 * question and its properties. Narrow screens open the side panels from
 * buttons.
 */
export function QuizEditor({
	data,
	actions,
	titleRevision = 0,
	onOpenSettings,
	onExit,
	onHostLive = () => {},
	onError = () => {},
	assistant,
}: {
	data: QuizEditorData;
	actions: EditorActions;
	assistant?: EditorAssistant;
	/** Bumped when the title changes outside the header (Configurações). */
	titleRevision?: number;
	onOpenSettings: () => void;
	/** Leaves the editor; pending saves were already sent. */
	onExit: (destination: ExitDestination) => void;
	/** "Organizar ao vivo", from "O quiz está pronto" (spec 008, RN-03). */
	onHostLive?: () => void;
	/** Shows a passing error message. */
	onError?: (message: string) => void;
}) {
	const { questions } = data;
	// `quietIds`: questions the creator has just started, which get no warnings
	// until they are left once (spec 004, RN-16).
	const [{ selectedId, quietIds }, setSelection] = useState(() => {
		const first = questions[0];
		return {
			selectedId: first?.id ?? "",
			quietIds: new Set(
				first && isBlankQuestion(first) ? [first.id] : [],
			) as ReadonlySet<string>,
		};
	});
	const [deletingId, setDeletingId] = useState<string | null>(null);
	// The steps of Salvar and of leaving (spec 006): one dialog at a time.
	const [dialog, setDialog] = useState<
		| { kind: "incomplete" | "touches" | "ready" }
		| { kind: "unsaved"; destination: ExitDestination }
		| null
	>(null);
	const [publishing, setPublishing] = useState(false);
	// The assistant is open on this source (spec 027), or closed.
	const [assistantSource, setAssistantSource] =
		useState<AssistantSource | null>(null);
	// Derived, not read once: the assistant's status may arrive after the editor.
	const [newQuizDismissed, setNewQuizDismissed] = useState(false);
	const newQuizOpen = (assistant?.offerNewQuiz ?? false) && !newQuizDismissed;
	const [discarding, setDiscarding] = useState(false);
	// By question: an upload belongs to the question it started in, whatever is
	// selected when it ends (spec 007, RN-12).
	const [uploads, setUploads] = useState<Record<string, ImageUploadState>>({});
	// Bumped to reload the header's title field from the saved title.
	const [titleReset, setTitleReset] = useState(0);
	// A question removed elsewhere (or not in the cache yet) falls back to the first.
	const selected =
		questions.find((question) => question.id === selectedId) ?? questions[0];

	if (!selected) {
		return null;
	}

	/** Leaving a question ends its quiet start; a newly added one begins quiet. */
	const moveSelection = (questionId: string, startsQuiet = false) =>
		setSelection((current) => {
			if (questionId === current.selectedId) {
				return current;
			}
			const quiet = new Set(current.quietIds);
			quiet.delete(current.selectedId);
			if (startsQuiet) {
				quiet.add(questionId);
			}
			return { selectedId: questionId, quietIds: quiet };
		});
	const select = (questionId: string) => {
		moveSelection(questionId);
	};
	/** Deleting asks first (spec 003, RN-14); this runs once the creator confirms. */
	const remove = (questionId: string) => {
		const index = questions.findIndex(({ id }) => id === questionId);
		const remaining = questions.filter(({ id }) => id !== questionId);
		if (questionId === selected.id) {
			moveSelection(selectionAfterRemoval(remaining, index) ?? "");
		}
		actions.deleteQuestion(questionId);
	};
	const deletingIndex = questions.findIndex(({ id }) => id === deletingId);
	const add = async (type: QuestionType) => {
		const placed = await actions.addQuestion(selected.id, type);
		if (placed) {
			moveSelection(placed.question.id, true);
		}
	};
	const duplicate = async (questionId: string) => {
		const placed = await actions.duplicateQuestion(questionId);
		if (placed) {
			moveSelection(placed.question.id);
		}
	};
	/** The assistant's questions go in, and the first of them is selected (RN-26). */
	const addGenerated = async (generated: GeneratedQuestionData[]) => {
		const firstId = await actions.addGeneratedQuestions(generated);
		if (firstId) {
			moveSelection(firstId);
		}
		return firstId !== null;
	};
	const uploadImage = async (questionId: string, file: File) => {
		const set = (state: ImageUploadState) =>
			setUploads((current) => ({ ...current, [questionId]: state }));
		set({ progress: 0, error: null });
		const failure = await actions.uploadQuestionImage(
			questionId,
			file,
			(progress) => set({ progress, error: null }),
		);
		set({ progress: null, error: failure });
	};

	const latest = () => actions.current() ?? data;

	/** A published quiz keeps a title: the field goes back to the saved one (RN-21). */
	const saveTitle = async (title: string | null) => {
		if (title === null && latest().quiz.status === "published") {
			onError(PUBLISHED_QUIZ_NEEDS_TITLE);
			setTitleReset((count) => count + 1);
			return;
		}
		await actions.saveTitle(title);
	};

	const publish = async (touches?: FinishingTouches) => {
		setPublishing(true);
		const failure = await actions.publish(touches);
		setPublishing(false);
		if (failure === null) {
			setDialog({ kind: "ready" });
			if (touches) {
				setTitleReset((count) => count + 1);
			}
		}
		return failure;
	};
	/** Salvar: the questions are checked first, then the title (spec 006, RN-09 a RN-13). */
	const requestPublish = async () => {
		const current = latest();
		if (incompleteQuestions(current.questions).length > 0) {
			// From here on every incomplete question is pointed out (RN-11).
			setSelection((selection) => ({ ...selection, quietIds: new Set() }));
			setDialog({ kind: "incomplete" });
			return;
		}
		if (current.quiz.title === null) {
			setDialog({ kind: "touches" });
			return;
		}
		const failure = await publish();
		if (failure !== null) {
			onError(failure);
		}
	};
	/** Leaving a published quiz with changes asks what to do with them (RN-23, RN-24). */
	const requestExit = (destination: ExitDestination) => {
		if (publishStateOf(latest()) === "unpublishedChanges") {
			setDialog({ kind: "unsaved", destination });
			return;
		}
		onExit(destination);
	};
	const discardAndExit = async (destination: ExitDestination) => {
		setDiscarding(true);
		const failure = await actions.discardChanges();
		setDiscarding(false);
		if (failure !== null) {
			onError(failure);
			return;
		}
		onExit(destination);
	};
	const closeDialog = () => setDialog(null);

	const propertiesProps = {
		question: selected,
		questionCount: questions.length,
		onChange: (change: QuestionChange) =>
			actions.changeQuestion(selected.id, change),
		onChangeType: (type: QuestionType) =>
			actions.changeQuestionType(selected.id, type),
		onApplyTimeLimitToAll: actions.applyTimeLimitToAll,
		onDelete: setDeletingId,
		onDuplicate: duplicate,
	};
	const selectedImageUrl = imageUrlOf(data, selected);
	const backgroundUrl =
		selected.image?.placement === "background" ? selectedImageUrl : null;

	return (
		<div className="flex h-svh flex-col">
			<EditorHeader
				key={`${titleRevision}:${titleReset}`}
				title={data.quiz.title}
				publishState={publishStateOf(data)}
				publishing={publishing}
				onSaveTitle={saveTitle}
				onOpenSettings={onOpenSettings}
				onExit={requestExit}
				onPublish={() => void requestPublish()}
			/>

			<div className="relative flex min-h-0 flex-1 max-lg:flex-col">
				{/* On compact screens, a strip under the question (as in Kahoot). */}
				<aside
					aria-label="Lista de perguntas"
					className="flex w-56 shrink-0 flex-col overflow-hidden border-border border-r bg-card max-lg:order-last max-lg:w-full max-lg:border-t max-lg:border-r-0"
				>
					<QuestionList
						questions={questions}
						imageUrls={data.imageUrls}
						selectedId={selected.id}
						quietIds={quietIds}
						onSelect={select}
						onAdd={add}
						onDuplicate={duplicate}
						onDelete={setDeletingId}
						onMove={actions.moveQuestion}
						onCreate={assistant && (() => setAssistantSource("topic"))}
					/>
				</aside>

				<div className="relative min-h-0 min-w-0 flex-1 bg-linear-to-b from-brand to-brand-strong">
					{/* As a background the image covers the whole question (spec 007, RN-23). */}
					{backgroundUrl && (
						<img
							src={backgroundUrl}
							alt={selected.image?.altText ?? QUESTION_IMAGE_FALLBACK_ALT}
							data-slot="question-background"
							className="absolute inset-0 size-full object-cover"
						/>
					)}
					<main className="relative h-full overflow-y-auto p-3 sm:p-5">
						<QuestionCanvas
							question={selected}
							imageUrl={selectedImageUrl}
							upload={uploads[selected.id] ?? NO_UPLOAD}
							onUploadImage={(file) => void uploadImage(selected.id, file)}
							showHints={!quietIds.has(selected.id)}
							onSaveText={(text) =>
								actions.saveQuestionField(selected.id, { kind: "text", text })
							}
							onSaveChoiceText={(choiceId, text) =>
								actions.saveQuestionField(selected.id, {
									kind: "choiceText",
									choiceId,
									text,
								})
							}
							onChange={(change) => actions.changeQuestion(selected.id, change)}
							titleAside={
								<QuestionPropertiesMenu
									className="lg:hidden"
									{...propertiesProps}
								/>
							}
						/>
					</main>
				</div>

				{/* On compact screens the ⋮ beside the question text holds these. */}
				<aside
					aria-label="Propriedades"
					className="hidden w-72 shrink-0 overflow-y-auto border-border border-l bg-card lg:block"
				>
					<QuestionPropertiesPanel {...propertiesProps} />
				</aside>
			</div>
			<DeleteQuestionDialog
				position={deletingIndex === -1 ? null : deletingIndex + 1}
				onCancel={() => setDeletingId(null)}
				onConfirm={() => {
					if (deletingId) {
						remove(deletingId);
					}
					setDeletingId(null);
				}}
			/>
			<IncompleteQuestionsDialog
				imageUrls={data.imageUrls}
				items={
					dialog?.kind === "incomplete" ? incompleteQuestions(questions) : null
				}
				onFix={(questionId) => {
					closeDialog();
					select(questionId);
				}}
				onBack={closeDialog}
				onLeave={() => onExit("library")}
			/>
			<FinishingTouchesDialog
				open={dialog?.kind === "touches"}
				initialDescription={data.quiz.description}
				onCancel={closeDialog}
				onSubmit={publish}
			/>
			<QuizReadyDialog
				open={dialog?.kind === "ready"}
				onBack={closeDialog}
				onDone={() => onExit("library")}
				onHostLive={onHostLive}
			/>
			{assistant && (
				<NewQuizDialog
					open={newQuizOpen}
					onChoose={(source) => {
						setNewQuizDismissed(true);
						setAssistantSource(source);
					}}
					onClose={() => setNewQuizDismissed(true)}
				/>
			)}
			{assistant && assistantSource && (
				<QuizAssistant
					open
					initialSource={assistantSource}
					status={assistant.status}
					// The lone blank question of a new quiz is replaced (RN-26).
					questionCount={
						questions.length === 1 && isBlankQuestion(selected)
							? 0
							: questions.length
					}
					actions={{
						generate: assistant.generate,
						uploadSource: assistant.uploadSource,
						discardSource: assistant.discardSource,
						add: addGenerated,
					}}
					onClose={() => setAssistantSource(null)}
				/>
			)}
			<UnsavedChangesDialog
				open={dialog?.kind === "unsaved"}
				busy={discarding}
				onBack={closeDialog}
				onLeave={() => {
					if (dialog?.kind === "unsaved") {
						onExit(dialog.destination);
					}
				}}
				onDiscard={() => {
					if (dialog?.kind === "unsaved") {
						void discardAndExit(dialog.destination);
					}
				}}
			/>
		</div>
	);
}
