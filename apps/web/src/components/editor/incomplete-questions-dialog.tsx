import type { QuestionIssue } from "@quizio/core/quiz/domain/question-issues";
import { Button } from "@quizio/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@quizio/ui/components/dialog";
import { ImageIcon } from "lucide-react";

import type { QuestionData } from "@/lib/api-types";
import { questionIssueLabel } from "@/lib/question-labels";
import { questionTypeLabel } from "@/lib/quiz-labels";

import { QuestionImageView, thumbnailImage } from "./question-image-view";

export interface IncompleteQuestionItem {
	question: QuestionData;
	/** 1-based, as in the question list. */
	position: number;
	issues: QuestionIssue[];
}

/**
 * What Salvar shows when some question is incomplete, as Kahoot does (spec 006,
 * RN-10): each question with its reasons and a way straight to it. `items` is
 * null while the dialog is closed.
 */
export function IncompleteQuestionsDialog({
	items,
	imageUrls = {},
	onFix,
	onBack,
	onLeave,
}: {
	items: readonly IncompleteQuestionItem[] | null;
	/** Public URLs of the question images, by key (spec 007, RN-32). */
	imageUrls?: Record<string, string>;
	onFix: (questionId: string) => void;
	onBack: () => void;
	/** "Deixar sem salvar": leaves the editor without publishing (RN-11a). */
	onLeave: () => void;
}) {
	return (
		<Dialog
			open={items !== null}
			onOpenChange={(open) => {
				if (!open) {
					onBack();
				}
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-xl">
				<DialogHeader className="pr-0">
					<DialogTitle className="text-2xl">
						Não é possível jogar este quiz
					</DialogTitle>
					<DialogDescription className="text-base text-foreground">
						Todas as perguntas precisam ser concluídas antes de começar a jogar.
					</DialogDescription>
				</DialogHeader>

				<ul
					aria-label="Perguntas incompletas"
					className="flex max-h-[50svh] flex-col gap-3 overflow-y-auto border border-border bg-muted p-3 sm:p-5"
				>
					{items?.map(({ question, position, issues }) => (
						<li
							key={question.id}
							className="shrink-0 rounded-md bg-card shadow-sm"
							aria-label={`Pergunta ${position}`}
						>
							<div className="flex items-start gap-3 p-1">
								<QuestionThumbnail
									question={question}
									url={
										question.image ? imageUrls[question.image.key] : undefined
									}
								/>
								<div className="flex min-w-0 flex-1 flex-col gap-0.5 py-2">
									<span className="text-sm">
										{`${position} - ${questionTypeLabel(question.type)}`}
									</span>
									{question.text && (
										<span className="truncate font-semibold text-sm">
											{question.text}
										</span>
									)}
								</div>
								<Button
									size="sm"
									className="m-2 shrink-0"
									aria-label={`Corrigir pergunta ${position}`}
									onClick={() => onFix(question.id)}
								>
									Corrigir
								</Button>
							</div>
							<ul>
								{issues.map((issue) => (
									<li
										key={issue}
										className="flex items-center gap-2 border-border border-t px-2 py-1.5 text-sm"
									>
										<span
											aria-hidden="true"
											className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground text-xs"
										>
											!
										</span>
										{questionIssueLabel(question, issue)}
									</li>
								))}
							</ul>
						</li>
					))}
				</ul>

				<DialogFooter className="sm:justify-center">
					<Button variant="secondary" onClick={onBack}>
						Voltar para edição
					</Button>
					<Button variant="success" onClick={onLeave}>
						Deixar sem salvar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** The question's image, or the empty media placeholder. */
function QuestionThumbnail({
	question,
	url,
}: {
	question: QuestionData;
	url: string | undefined;
}) {
	if (question.image && url) {
		return (
			<span
				aria-hidden="true"
				data-slot="question-thumbnail"
				className="block h-16 w-24 shrink-0 overflow-hidden rounded-sm bg-muted"
			>
				<QuestionImageView
					image={thumbnailImage(question.image)}
					url={url}
					decorative
				/>
			</span>
		);
	}
	return (
		<span
			aria-hidden="true"
			className="flex h-16 w-24 shrink-0 items-center justify-center rounded-sm border border-muted-foreground/40 border-dashed"
		>
			<ImageIcon className="size-5 text-muted-foreground/60" />
		</span>
	);
}
