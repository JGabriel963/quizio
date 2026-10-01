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
import { PlusIcon } from "lucide-react";

import { questionTypeLabel } from "@/lib/quiz-labels";

import { ActionButton } from "./question-actions";
import { QuestionTypeIcon } from "./question-type-icon";

const addLabel = (
	<>
		<PlusIcon data-icon="inline-start" />
		Adicionar
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
			<ActionButton unavailableReason={unavailableReason}>
				{addLabel}
			</ActionButton>
		);
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button />}>{addLabel}</DropdownMenuTrigger>
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
							<DropdownMenuItem
								key={type}
								onClick={() => onPick(type)}
								className="h-24 w-36 flex-col justify-center gap-2 bg-muted text-center font-bold text-sm shadow-press-light"
							>
								<QuestionTypeIcon type={type} />
								{questionTypeLabel(type)}
							</DropdownMenuItem>
						))}
					</div>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
