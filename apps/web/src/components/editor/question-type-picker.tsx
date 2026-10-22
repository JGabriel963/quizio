import {
	QUESTION_TYPES,
	type QuestionType,
} from "@quizio/core/quiz/domain/question";
import { Button } from "@quizio/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@quizio/ui/components/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@quizio/ui/components/tooltip";
import { PlusIcon } from "lucide-react";

import { QUESTION_TYPE_PREVIEWS } from "@/lib/question-type-previews";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { ActionButton } from "./question-actions";
import { QuestionTypeIcon } from "./question-type-icon";

const addLabel = (
	<>
		<PlusIcon data-icon="inline-start" />
		{/* Only the icon in the compact strip, as in Kahoot. */}
		<span className="max-lg:sr-only">Adicionar</span>
	</>
);

/**
 * "Adicionar" opens the type picker (spec 005, RN-02): a panel beside the
 * button with one card per available type, like Kahoot's. At the question
 * limit the button only explains why (RN-04).
 */
export function QuestionTypePicker({
	unavailableReason,
	onPick,
}: {
	unavailableReason: string | null;
	onPick: (type: QuestionType) => void;
}) {
	if (unavailableReason) {
		return (
			<ActionButton
				className="w-full max-lg:size-11 max-lg:px-0 max-lg:has-data-[icon=inline-start]:pl-0"
				unavailableReason={unavailableReason}
			>
				{addLabel}
			</ActionButton>
		);
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button className="w-full max-lg:size-11 max-lg:px-0 max-lg:has-data-[icon=inline-start]:pl-0" />
				}
			>
				{addLabel}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="right"
				align="end"
				sideOffset={12}
				// Beside the button; below it where there is no room, as on phones.
				collisionAvoidance={{
					side: "flip",
					align: "shift",
					fallbackAxisSide: "end",
				}}
				className="w-auto max-w-[calc(100vw-1.5rem)] bg-card p-3"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="px-0 pt-0 pb-2 font-bold text-foreground text-sm">
						Testar conhecimento
					</DropdownMenuLabel>
					<div className="grid grid-cols-2 gap-2">
						{QUESTION_TYPES.map((type) => (
							<Tooltip key={type}>
								<TooltipTrigger
									render={
										<DropdownMenuItem
											onClick={() => onPick(type)}
											className="h-24 w-36 flex-col justify-center gap-2 bg-muted text-center font-bold text-sm shadow-press-light"
										/>
									}
								>
									<QuestionTypeIcon type={type} />
									{questionTypeLabel(type)}
								</TooltipTrigger>
								{/* Floats beside the card, over the editor: it takes no room in the picker. */}
								<TooltipContent
									side="right"
									sideOffset={12}
									className="max-w-none bg-card p-0 text-foreground shadow-md ring-1 ring-foreground/10 max-md:hidden [&>div:last-child]:bg-card [&>div:last-child]:fill-card"
								>
									<TypePreview type={type} />
								</TooltipContent>
							</Tooltip>
						))}
					</div>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * The tooltip of a type in the picker: an example of the type and what it
 * does (spec 031, RN-01). Not on phones: there is no hover.
 */
function TypePreview({ type }: { type: QuestionType }) {
	const preview = QUESTION_TYPE_PREVIEWS[type];
	const name = questionTypeLabel(type);
	return (
		<section
			aria-label={`Prévia de ${name}`}
			className="flex w-60 flex-col gap-3 p-3"
		>
			<div className="flex flex-col items-center gap-2 rounded-sm bg-muted p-3">
				<p className="text-center font-bold text-xs">{preview.example}</p>
				<div className="h-12 w-24 rounded-sm bg-primary/15" />
				{type === "slider" ? (
					<SliderPreview value={preview.answers[0] ?? ""} />
				) : (
					<div
						className={
							type === "typeAnswer" ? "w-28" : "grid w-full grid-cols-2 gap-1"
						}
					>
						{preview.answers.map((answer, index) => (
							<span
								key={answer}
								className={
									type === "typeAnswer"
										? "block rounded-sm bg-answer-blue px-2 py-1.5 text-center font-bold text-white text-xs"
										: `block truncate rounded-sm px-2 py-1 text-[10px] text-white ${PREVIEW_COLORS[type === "trueFalse" ? (index === 0 ? 1 : 0) : index] ?? ""}`
								}
							>
								{answer}
							</span>
						))}
					</div>
				)}
			</div>
			<div>
				<p className="font-bold text-sm">{name}</p>
				<p className="text-muted-foreground text-sm">{preview.description}</p>
			</div>
		</section>
	);
}

/** A scale with the marker on the example's answer (spec 032, RN-01). */
function SliderPreview({ value }: { value: string }) {
	return (
		<div className="flex w-full flex-col items-center">
			<span className="rounded-sm bg-answer-blue px-2 py-1 font-black text-white text-xs">
				{value}
			</span>
			<div className="flex h-8 w-full items-end justify-between rounded-sm bg-card px-1 pb-1">
				{Array.from({ length: 21 }, (_, index) => (
					<span
						key={index}
						className={
							index === 12
								? "h-6 w-0.5 bg-answer-blue"
								: "h-5 w-0.5 bg-foreground/20"
						}
					/>
				))}
			</div>
		</div>
	);
}

const PREVIEW_COLORS = [
	"bg-answer-red",
	"bg-answer-blue",
	"bg-answer-yellow",
	"bg-answer-green",
];
