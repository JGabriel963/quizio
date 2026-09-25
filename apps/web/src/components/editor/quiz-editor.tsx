import { Button } from "@quizio/ui/components/button";
import { cn } from "@quizio/ui/lib/utils";
import { ListIcon, SlidersHorizontalIcon } from "lucide-react";
import { useId, useState } from "react";

import type { QuestionData, QuizEditorData } from "@/lib/api-types";
import { selectionAfterRemoval } from "@/lib/editor-cache";

import { EditorHeader } from "./editor-header";
import { QuestionCanvas } from "./question-canvas";
import { QuestionList } from "./question-list";
import { QuestionPropertiesPanel } from "./question-properties-panel";

export interface PlacedQuestionData {
	question: QuestionData;
	index: number;
}

/** What the editor asks of the API; the route wires it to tRPC (spec 003). */
export interface EditorActions {
	saveTitle: (title: string | null) => Promise<unknown>;
	saveQuestionText: (
		questionId: string,
		text: string | null,
	) => Promise<unknown>;
	/** Resolves the new question, or null when the server refused it. */
	addQuestion: (afterQuestionId: string) => Promise<PlacedQuestionData | null>;
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
	const [selectedId, setSelectedId] = useState(questions[0]?.id ?? "");
	const [openPanel, setOpenPanel] = useState<"list" | "properties" | null>(
		null,
	);
	const panelIds = { list: useId(), properties: useId() };
	// A question removed elsewhere (or not in the cache yet) falls back to the first.
	const selected =
		questions.find((question) => question.id === selectedId) ?? questions[0];

	if (!selected) {
		return null;
	}

	const select = (questionId: string) => {
		setSelectedId(questionId);
		setOpenPanel(null);
	};
	const selectPlaced = (placed: PlacedQuestionData | null) => {
		if (placed) {
			setSelectedId(placed.question.id);
		}
	};
	const remove = (questionId: string) => {
		const index = questions.findIndex(({ id }) => id === questionId);
		const remaining = questions.filter(({ id }) => id !== questionId);
		if (questionId === selected.id) {
			setSelectedId(selectionAfterRemoval(remaining, index) ?? "");
		}
		actions.deleteQuestion(questionId);
	};
	const duplicate = async (questionId: string) =>
		selectPlaced(await actions.duplicateQuestion(questionId));
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
						onSelect={select}
						onAdd={async () =>
							selectPlaced(await actions.addQuestion(selected.id))
						}
						onDuplicate={duplicate}
						onDelete={remove}
						onMove={actions.moveQuestion}
					/>
				</aside>

				<main className="min-w-0 flex-1 overflow-y-auto bg-linear-to-b from-brand to-brand-strong px-3 py-4 sm:px-6 sm:py-6">
					<QuestionCanvas
						question={selected}
						onSaveText={(text) => actions.saveQuestionText(selected.id, text)}
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
						onDelete={remove}
						onDuplicate={duplicate}
					/>
				</aside>
			</div>
		</div>
	);
}
