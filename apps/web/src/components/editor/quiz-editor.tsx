import {
	isBlankQuestion,
	type QuestionType,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { ListIcon, SlidersHorizontalIcon } from "lucide-react";
import { useId, useState } from "react";

import type { QuestionData, QuizEditorData } from "@/lib/api-types";
import { selectionAfterRemoval } from "@/lib/editor-cache";

import { DeleteQuestionDialog } from "./delete-question-dialog";
import { EditorHeader } from "./editor-header";
import { QuestionCanvas } from "./question-canvas";
import { QuestionList } from "./question-list";
import { QuestionPropertiesPanel } from "./question-properties-panel";

export interface PlacedQuestionData {
	question: QuestionData;
	index: number;
}

/** What the editor asks of the API; the route wires it to tRPC (specs 003 to 005). */
export interface EditorActions {
	saveTitle: (title: string | null) => Promise<unknown>;
	/** Autosaved text fields (question and answers); rejects when it fails. */
	saveQuestionField: (
		questionId: string,
		change: QuestionChange,
	) => Promise<unknown>;
	/** Changes saved at once (corrects, time, points...), tracked by the action. */
	changeQuestion: (questionId: string, change: QuestionChange) => void;
	/** Keeps the question and swaps its answers for the other type's (spec 005). */
	changeQuestionType: (questionId: string, type: QuestionType) => void;
	applyTimeLimitToAll: (seconds: QuestionData["timeLimitSeconds"]) => void;
	/** Resolves the new question, or null when the server refused it. */
	addQuestion: (
		afterQuestionId: string,
		type: QuestionType,
	) => Promise<PlacedQuestionData | null>;
	duplicateQuestion: (questionId: string) => Promise<PlacedQuestionData | null>;
	moveQuestion: (questionId: string, toIndex: number) => void;
	deleteQuestion: (questionId: string) => void;
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
}: {
	data: QuizEditorData;
	actions: EditorActions;
	/** Bumped when the title changes outside the header (Configurações). */
	titleRevision?: number;
	onOpenSettings: () => void;
	onExit: () => void;
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
	const [openPanel, setOpenPanel] = useState<"list" | "properties" | null>(
		null,
	);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const panelIds = { list: useId(), properties: useId() };
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
		setOpenPanel(null);
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
	const toggle = (panel: "list" | "properties") =>
		setOpenPanel((open) => (open === panel ? null : panel));

	return (
		<div className="flex h-svh flex-col">
			<EditorHeader
				key={titleRevision}
				title={data.quiz.title}
				onSaveTitle={actions.saveTitle}
				onOpenSettings={onOpenSettings}
				onExit={onExit}
			/>

			<div className="flex gap-2 border-border border-b bg-card px-3 py-2 lg:hidden">
				<Button
					variant="outline"
					size="sm"
					aria-expanded={openPanel === "list"}
					aria-controls={panelIds.list}
					onClick={() => toggle("list")}
				>
					<ListIcon data-icon="inline-start" />
					Lista de perguntas
				</Button>
				<Button
					variant="outline"
					size="sm"
					aria-expanded={openPanel === "properties"}
					aria-controls={panelIds.properties}
					onClick={() => toggle("properties")}
					className="ml-auto"
				>
					<SlidersHorizontalIcon data-icon="inline-start" />
					Propriedades
				</Button>
			</div>

			<div className="relative flex min-h-0 flex-1">
				<aside
					id={panelIds.list}
					aria-label="Lista de perguntas"
					className={cn(
						"z-20 w-56 shrink-0 overflow-y-auto border-border border-r bg-card max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-lg",
						openPanel === "list" ? "block" : "hidden lg:block",
					)}
				>
					<QuestionList
						questions={questions}
						selectedId={selected.id}
						quietIds={quietIds}
						onSelect={select}
						onAdd={add}
						onDuplicate={duplicate}
						onDelete={setDeletingId}
						onMove={actions.moveQuestion}
					/>
				</aside>

				<main className="min-w-0 flex-1 overflow-y-auto bg-linear-to-b from-brand to-brand-strong px-3 py-4 sm:px-6 sm:py-6">
					<QuestionCanvas
						question={selected}
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
					/>
				</main>

				<aside
					id={panelIds.properties}
					aria-label="Propriedades"
					className={cn(
						"z-20 w-72 shrink-0 overflow-y-auto border-border border-l bg-card max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:shadow-lg",
						openPanel === "properties" ? "block" : "hidden lg:block",
					)}
				>
					<QuestionPropertiesPanel
						question={selected}
						questionCount={questions.length}
						onChange={(change) => actions.changeQuestion(selected.id, change)}
						onChangeType={(type) =>
							actions.changeQuestionType(selected.id, type)
						}
						onApplyTimeLimitToAll={actions.applyTimeLimitToAll}
						onDelete={setDeletingId}
						onDuplicate={duplicate}
					/>
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
		</div>
	);
}
