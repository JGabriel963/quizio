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
	ChevronRightIcon,
	CopyIcon,
	EyeIcon,
	EyeOffIcon,
	MonitorPlayIcon,
	PencilIcon,
	PlayIcon,
	SendIcon,
	UsersIcon,
} from "lucide-react";
import { useState } from "react";

import { UserAvatar } from "@/components/account/user-avatar";
import { QuizCover } from "@/components/quiz/quiz-cover";
import type { PublicQuizPageData, SharedQuizPageData } from "@/lib/api-types";

import { SharedQuestionList } from "./shared-question-list";

/**
 * The page of a quiz shared with the group (spec 037, RN-16 to RN-21): the
 * owner with Editar and Duplicar, the quiz, "N jogos" and "N participantes",
 * "Organizar ao vivo" and Atribuir, and the questions with "Mostrar
 * respostas". The route wires the actions. A public quiz opened from its
 * owner's profile is the same page, without "Compartilhado por" (spec 039,
 * RN-33).
 */
export function SharedQuizPage({
	quiz,
	duplicating = false,
	onHost,
	onAssign,
	onDuplicate,
}: {
	quiz: SharedQuizPageData | PublicQuizPageData;
	duplicating?: boolean;
	onHost: () => void;
	onAssign: () => void;
	onDuplicate: () => void;
}) {
	const [showAnswers, setShowAnswers] = useState(false);
	const [askingToDuplicate, setAskingToDuplicate] = useState(false);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-3 border-border border-b pb-4">
				<p className="flex items-center gap-2 font-semibold text-sm">
					<UserAvatar
						userId={quiz.owner.userId}
						photoUrl={quiz.owner.photoUrl}
						size="sm"
					/>
					{quiz.owner.name}
				</p>
				<div className="flex items-center gap-1">
					<Button variant="ghost" onClick={() => setAskingToDuplicate(true)}>
						<PencilIcon aria-hidden="true" />
						Editar
					</Button>
					<Button
						variant="ghost"
						disabled={duplicating}
						aria-busy={duplicating || undefined}
						onClick={onDuplicate}
					>
						<CopyIcon aria-hidden="true" />
						Duplicar
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-6 lg:flex-row">
				<div className="flex flex-1 flex-col gap-4 sm:flex-row">
					<QuizCover
						url={quiz.coverUrl}
						className="aspect-video w-full shrink-0 sm:w-64"
					/>
					<div className="flex min-w-0 flex-col gap-2">
						<p className="text-muted-foreground text-xs">Quiz</p>
						<h1 className="font-bold text-2xl">{quiz.title}</h1>
						{quiz.description && (
							<p className="whitespace-pre-line text-sm">{quiz.description}</p>
						)}
						<p className="flex flex-wrap gap-4 text-muted-foreground text-sm">
							<span className="inline-flex items-center gap-1">
								<PlayIcon aria-hidden="true" className="size-4" />
								{quiz.games} {quiz.games === 1 ? "jogo" : "jogos"}
							</span>
							<span className="inline-flex items-center gap-1">
								<UsersIcon aria-hidden="true" className="size-4" />
								{quiz.participants}{" "}
								{quiz.participants === 1 ? "participante" : "participantes"}
							</span>
						</p>
						{"sharedBy" in quiz && (
							<p className="text-muted-foreground text-xs">
								Compartilhado por {quiz.sharedBy.name}
							</p>
						)}
					</div>
				</div>
				<section
					aria-label="Sessão de kahoot"
					className="flex flex-col gap-2 lg:w-72"
				>
					<SessionButton
						primary
						icon={<MonitorPlayIcon />}
						label="Organizar ao vivo"
						onClick={onHost}
					/>
					<SessionButton
						icon={<SendIcon />}
						label="Atribuir"
						onClick={onAssign}
					/>
				</section>
			</div>

			<section className="flex flex-col gap-3" aria-labelledby="questions">
				<div className="flex items-center justify-between gap-3">
					<h2 id="questions" className="font-bold text-lg">
						Perguntas ({quiz.questions.length})
					</h2>
					<Button
						variant="ghost"
						aria-pressed={showAnswers}
						onClick={() => setShowAnswers((shown) => !shown)}
					>
						{showAnswers ? (
							<EyeOffIcon aria-hidden="true" />
						) : (
							<EyeIcon aria-hidden="true" />
						)}
						{showAnswers ? "Ocultar respostas" : "Mostrar respostas"}
					</Button>
				</div>
				<SharedQuestionList
					questions={quiz.questions}
					imageUrls={quiz.imageUrls}
					showAnswers={showAnswers}
				/>
			</section>

			<DuplicateToEditDialog
				open={askingToDuplicate}
				onCancel={() => setAskingToDuplicate(false)}
				onDuplicate={() => {
					setAskingToDuplicate(false);
					onDuplicate();
				}}
			/>
		</div>
	);
}

function SessionButton({
	icon,
	label,
	primary = false,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	primary?: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			variant={primary ? "default" : "secondary"}
			size="lg"
			className="justify-between"
			onClick={onClick}
		>
			<span className="inline-flex items-center gap-2">
				{icon}
				{label}
			</span>
			<ChevronRightIcon aria-hidden="true" />
		</Button>
	);
}

/** Editar of somebody else's quiz (spec 037, RN-18). */
export function DuplicateToEditDialog({
	open,
	onCancel,
	onDuplicate,
}: {
	open: boolean;
	onCancel: () => void;
	onDuplicate: () => void;
}) {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onCancel();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Duplique para editar</AlertDialogTitle>
					<AlertDialogDescription>
						Não é possível editar esse quiz, mas é possível duplicá-lo para
						realizar edições.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction onClick={onDuplicate}>Duplicar</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
