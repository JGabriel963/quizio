import { GROUP_POST_MESSAGE_MAX_LENGTH } from "@quizio/core/groups/domain/group-post";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { XIcon } from "lucide-react";
import { useState } from "react";

import { CountedField } from "@/components/groups/counted-field";
import { QuizCover } from "@/components/quiz/quiz-cover";
import { assignmentErrorMessage } from "@/lib/assignment-error-messages";
import type { PickedQuiz } from "@/lib/group-assign-state";
import { groupErrorMessage } from "@/lib/group-error-messages";

/**
 * "Criar publicação" from "Adicionar mensagem" (spec 038, RN-11, RN-12): the
 * text and the quiz, which X goes back to change. Cancelar closes everything.
 */
export function AssignmentPostDialog({
	open,
	quiz,
	message,
	onMessageChange,
	onRemoveQuiz,
	onCancel,
	onPublish,
}: {
	open: boolean;
	quiz: PickedQuiz;
	message: string;
	onMessageChange: (message: string) => void;
	onRemoveQuiz: () => void;
	onCancel: () => void;
	onPublish: () => Promise<unknown>;
}) {
	const [error, setError] = useState<string | null>(null);
	const [publishing, setPublishing] = useState(false);
	const blank = message.trim() === "";

	async function publish() {
		if (blank || publishing) {
			return;
		}
		setPublishing(true);
		setError(null);
		try {
			await onPublish();
		} catch (failure) {
			const groupMessage = groupErrorMessage(failure, "");
			setError(
				groupMessage ||
					assignmentErrorMessage(
						failure,
						"Não foi possível publicar. Tente novamente.",
					),
			);
			setPublishing(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onCancel();
				}
			}}
		>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Criar publicação</DialogTitle>
				</DialogHeader>
				<CountedField
					label="Mensagem"
					labelHidden
					value={message}
					max={GROUP_POST_MESSAGE_MAX_LENGTH}
					placeholder="Digite seu texto"
					multiline
					autoFocus
					error={error}
					onChange={(value) => {
						onMessageChange(value);
						setError(null);
					}}
				/>
				<div className="rounded-md bg-muted p-3">
					<div className="flex items-center gap-3 overflow-hidden rounded-md bg-card shadow-sm">
						<QuizCover
							url={quiz.coverImageUrl ?? null}
							className="w-28 shrink-0 rounded-none"
						/>
						<div className="min-w-0 flex-1 py-2">
							<p className="truncate font-bold">{quiz.title}</p>
							{quiz.ownerName && (
								<p className="text-muted-foreground text-xs">
									{quiz.ownerName}
								</p>
							)}
						</div>
						<Button
							variant="outline"
							size="icon"
							className="mr-3"
							aria-label="Trocar o quiz"
							onClick={onRemoveQuiz}
						>
							<XIcon />
						</Button>
					</div>
				</div>
				<DialogFooter className="sm:justify-center">
					<Button variant="secondary" onClick={onCancel}>
						Cancelar
					</Button>
					<Button
						disabled={blank || publishing}
						aria-busy={publishing || undefined}
						onClick={publish}
					>
						Publicar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
