import {
	QUESTION_POINTS,
	QUESTION_TYPES,
	type QuestionType,
	SELECTION_MODES,
	timeLimitsFor,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";
import { ANSWER_MARGINS } from "@quizio/core/shared/domain/slider-scale";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import { Label } from "@quizio/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@quizio/ui/components/radio-group";
import { cn } from "@quizio/ui/lib/utils";
import {
	ClockIcon,
	CopyIcon,
	DiffIcon,
	EllipsisVerticalIcon,
	ListChecksIcon,
	PaletteIcon,
	SquareCheckIcon,
	Trash2Icon,
	TrophyIcon,
} from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import type { QuestionData } from "@/lib/api-types";
import {
	ANSWER_MARGIN_DESCRIPTIONS,
	ANSWER_MARGIN_LABELS,
	POINTS_DESCRIPTIONS,
	POINTS_LABELS,
	SELECTION_DESCRIPTIONS,
	SELECTION_LABELS,
	shortTimeLimitLabel,
	timeLimitLabel,
} from "@/lib/question-labels";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { questionActionReasons } from "./question-actions";
import { QuestionTypeIcon } from "./question-type-icon";

type Property = "type" | "timeLimit" | "points" | "selection" | "margin";

/**
 * The question's properties on compact screens, where there is no right panel:
 * a ⋮ beside the question text opens them, each in a dialog, plus Duplicar and
 * Excluir (as in Kahoot). Same changes as `QuestionPropertiesPanel`.
 */
export function QuestionPropertiesMenu({
	question,
	questionCount,
	onChange,
	onChangeType,
	onApplyTimeLimitToAll,
	onDelete,
	onDuplicate,
	onOpenThemes,
	className,
}: {
	question: QuestionData;
	questionCount: number;
	onChange: (change: QuestionChange) => void;
	onChangeType: (type: QuestionType) => void;
	onApplyTimeLimitToAll: (seconds: QuestionData["timeLimitSeconds"]) => void;
	onDelete: (questionId: string) => void;
	onDuplicate: (questionId: string) => void;
	/** The quiz's themes, here where there is no side rail (spec 042, RN-28). */
	onOpenThemes?: () => void;
	className?: string;
}) {
	const { deleteReason, growReason } = questionActionReasons(questionCount);
	const [open, setOpen] = useState<Property | null>(null);
	const close = () => setOpen(null);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="outline"
							size="icon"
							aria-label="Propriedades da pergunta"
							className={cn(
								"shrink-0 rounded-full border-0 bg-card shadow-press-light",
								className,
							)}
						/>
					}
				>
					<EllipsisVerticalIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-auto">
					<DropdownMenuItem onClick={() => setOpen("type")}>
						<ListChecksIcon />
						Alterar tipo de pergunta
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setOpen("timeLimit")}>
						<ClockIcon />
						Definir limite de tempo
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setOpen("points")}>
						<TrophyIcon />
						Pontos
					</DropdownMenuItem>
					{question.type === "quiz" && (
						<DropdownMenuItem onClick={() => setOpen("selection")}>
							<SquareCheckIcon />
							Opções de resposta
						</DropdownMenuItem>
					)}
					{question.type === "slider" && (
						<DropdownMenuItem
							disabled={question.answer === null}
							onClick={() => setOpen("margin")}
						>
							<DiffIcon />
							Margem de resposta
						</DropdownMenuItem>
					)}
					{onOpenThemes && (
						<DropdownMenuItem onClick={onOpenThemes}>
							<PaletteIcon />
							Temas
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						disabled={growReason !== null}
						onClick={() => onDuplicate(question.id)}
					>
						<CopyIcon />
						Duplicar
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						disabled={deleteReason !== null}
						onClick={() => onDelete(question.id)}
					>
						<Trash2Icon />
						Excluir
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Picking a type changes it at once; only Cancelar, as in Kahoot. */}
			<PropertyDialog
				open={open === "type"}
				title="Alterar tipo de pergunta"
				onClose={close}
			>
				<RadioGroup
					aria-label="Tipo de pergunta"
					value={question.type}
					onValueChange={(type) => {
						close();
						if (type !== question.type) {
							onChangeType(type as QuestionType);
						}
					}}
					className="grid-cols-2"
				>
					{QUESTION_TYPES.map((type) => (
						<Tile key={type} value={type}>
							<QuestionTypeIcon type={type} />
							{questionTypeLabel(type)}
						</Tile>
					))}
				</RadioGroup>
			</PropertyDialog>

			<ChoiceDialog
				open={open === "timeLimit"}
				title="Limite de tempo"
				value={question.timeLimitSeconds}
				onClose={close}
				onDone={(seconds) => {
					if (seconds !== question.timeLimitSeconds) {
						onChange({ kind: "timeLimit", seconds });
					}
				}}
				extra={(seconds) => (
					<Button
						variant="link"
						size="sm"
						className="justify-self-center"
						onClick={() => {
							close();
							onApplyTimeLimitToAll(seconds);
						}}
					>
						Aplicar a todas as perguntas
					</Button>
				)}
			>
				{timeLimitsFor(question.type).map((seconds) => (
					<Tile key={seconds} value={seconds} name={timeLimitLabel(seconds)}>
						{shortTimeLimitLabel(seconds)}
					</Tile>
				))}
			</ChoiceDialog>

			<ChoiceDialog
				open={open === "points"}
				title="Pontos"
				value={question.points}
				onClose={close}
				onDone={(points) => {
					if (points !== question.points) {
						onChange({ kind: "points", points });
					}
				}}
				layout="list"
			>
				{QUESTION_POINTS.map((points) => (
					<Option
						key={points}
						value={points}
						label={POINTS_LABELS[points]}
						description={POINTS_DESCRIPTIONS[points]}
					/>
				))}
			</ChoiceDialog>

			{question.type === "quiz" && (
				<ChoiceDialog
					open={open === "selection"}
					title="Opções de resposta"
					value={question.selection}
					onClose={close}
					onDone={(selection) => {
						if (selection !== question.selection) {
							onChange({ kind: "selection", selection });
						}
					}}
					layout="list"
				>
					{SELECTION_MODES.map((selection) => (
						<Option
							key={selection}
							value={selection}
							label={SELECTION_LABELS[selection]}
							description={SELECTION_DESCRIPTIONS[selection]}
						/>
					))}
				</ChoiceDialog>
			)}

			{question.type === "slider" && (
				<ChoiceDialog
					open={open === "margin"}
					title="Margem de resposta"
					value={question.answerMargin}
					onClose={close}
					onDone={(margin) => {
						if (margin !== question.answerMargin) {
							onChange({ kind: "answerMargin", margin });
						}
					}}
					layout="list"
				>
					{ANSWER_MARGINS.map((margin) => (
						<Option
							key={margin}
							value={margin}
							label={ANSWER_MARGIN_LABELS[margin]}
							description={ANSWER_MARGIN_DESCRIPTIONS[margin]}
						/>
					))}
				</ChoiceDialog>
			)}
		</>
	);
}

function PropertyDialog({
	open,
	title,
	onClose,
	children,
	footer,
}: {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent showCloseButton={false} className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="font-bold text-xl">{title}</DialogTitle>
				</DialogHeader>
				{children}
				<DialogFooter className="sm:justify-center">
					<Button variant="secondary" onClick={onClose}>
						Cancelar
					</Button>
					{footer}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** A choice made in a dialog and saved only on Pronto; Cancelar keeps the question as it was. */
function ChoiceDialog<T extends string | number>({
	open,
	title,
	value,
	onClose,
	onDone,
	extra,
	layout = "grid",
	children,
}: {
	open: boolean;
	title: string;
	value: T;
	onClose: () => void;
	onDone: (value: T) => void;
	extra?: (draft: T) => ReactNode;
	layout?: "grid" | "list";
	children: ReactNode;
}) {
	const [draft, setDraft] = useState(value);
	const [wasOpen, setWasOpen] = useState(open);
	// Every opening starts from the question's current value.
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setDraft(value);
		}
	}

	return (
		<PropertyDialog
			open={open}
			title={title}
			onClose={onClose}
			footer={
				<Button
					variant="success"
					onClick={() => {
						onClose();
						onDone(draft);
					}}
				>
					Pronto
				</Button>
			}
		>
			<RadioGroup
				aria-label={title}
				value={draft}
				onValueChange={(next) => setDraft(next as T)}
				className={layout === "grid" ? "grid-cols-4" : "gap-4"}
			>
				{children}
			</RadioGroup>
			{extra?.(draft)}
		</PropertyDialog>
	);
}

/** A choice drawn as a tile: the time limits and the question types. */
function Tile({
	value,
	name,
	children,
}: {
	value: string | number;
	/** The accessible name, when it says more than the tile shows. */
	name?: string;
	children: ReactNode;
}) {
	const nameId = useId();
	return (
		<Label className="relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md bg-muted px-2 py-3 text-center font-bold text-sm shadow-press-light has-data-checked:bg-primary has-data-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
			<RadioGroupItem
				value={value}
				aria-labelledby={nameId}
				// The whole tile is the radio, drawn by the label around it.
				className="absolute inset-0 aspect-auto size-full rounded-md border-0 opacity-0 after:hidden"
			/>
			{name ? (
				<>
					<span aria-hidden="true">{children}</span>
					<span id={nameId} className="sr-only">
						{name}
					</span>
				</>
			) : (
				<span id={nameId} className="flex flex-col items-center gap-1">
					{children}
				</span>
			)}
		</Label>
	);
}

/** A choice with its explanation under it: points and answer options. */
function Option({
	value,
	label,
	description,
}: {
	value: string;
	label: string;
	description: string;
}) {
	const labelId = useId();
	const descriptionId = useId();
	return (
		<Label className="flex cursor-pointer items-start gap-3 font-normal">
			<RadioGroupItem
				value={value}
				aria-labelledby={labelId}
				aria-describedby={descriptionId}
				className="mt-0.5"
			/>
			<span className="flex flex-col gap-0.5">
				<span id={labelId} className="font-semibold">
					{label}
				</span>
				<span id={descriptionId} className="text-muted-foreground text-xs">
					{description}
				</span>
			</span>
		</Label>
	);
}
