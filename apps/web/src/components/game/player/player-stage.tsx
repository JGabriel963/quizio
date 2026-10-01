import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { QuestionTypeIcon } from "@/components/editor/question-type-icon";
import type {
	PlayerQuestionData,
	PlayerResultData,
	PlayerStageData,
} from "@/lib/api-types";
import { waitingPhrase } from "@/lib/game-stage";
import { questionTypeLabel } from "@/lib/quiz-labels";
import { useCountdown } from "@/lib/use-countdown";

import { GameScreen } from "../game-screen";
import { AnswerButtons } from "./answer-buttons";
import { JoinNotice } from "./join-forms";

/** The frame of the player's game screens: the question on top, the nickname at the bottom. */
function PlayerFrame({
	nickname,
	questionNumber,
	question,
	notice = null,
	children,
}: {
	nickname: string;
	questionNumber?: number;
	question?: PlayerQuestionData | null;
	notice?: string | null;
	children: ReactNode;
}) {
	return (
		<GameScreen className="flex h-svh flex-col overflow-hidden">
			{question && questionNumber !== undefined && (
				<header className="flex h-14 shrink-0 items-center justify-between px-3">
					<span
						data-slot="question-number"
						aria-hidden="true"
						className="flex size-9 items-center justify-center rounded-full bg-white/90 font-black text-neutral-800"
					>
						{questionNumber}
					</span>
					<span className="flex items-center gap-2 rounded-full bg-white/90 py-1 pr-4 pl-2 font-bold text-neutral-800 text-sm">
						<QuestionTypeIcon type={question.type} className="h-7 w-5" />
						{questionTypeLabel(question.type)}
					</span>
					<span className="size-9" />
				</header>
			)}
			{children}
			<footer className="flex h-12 shrink-0 items-center bg-black/40 px-4">
				<span data-slot="player-nickname" className="truncate font-bold">
					{nickname}
				</span>
			</footer>
			<JoinNotice message={notice} />
		</GameScreen>
	);
}

function Centered({ children }: { children: ReactNode }) {
	return (
		<main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
			{children}
		</main>
	);
}

function Spinner() {
	return (
		<LoaderCircleIcon aria-hidden="true" className="size-16 animate-spin" />
	);
}

const RESULTS: Record<
	PlayerResultData,
	{ title: string; good: boolean; strip: string | null }
> = {
	correct: { title: "Correto", good: true, strip: null },
	partiallyCorrect: { title: "Parcialmente correto", good: true, strip: null },
	wrong: { title: "Incorreto", good: false, strip: "Boa tentativa!" },
	timeout: { title: "Tempo esgotado", good: false, strip: "Ainda não acabou!" },
};

/**
 * How the player did: only the result, never which answer was right (spec
 * 009, RN-25, RN-26).
 */
function ResultScreen({ result }: { result: PlayerResultData }) {
	const { title, good, strip } = RESULTS[result];
	const Mark = good ? CheckIcon : XIcon;

	return (
		<Centered>
			<h1 className="font-black text-4xl sm:text-5xl">{title}</h1>
			<span
				data-slot="result-mark"
				data-result={result}
				className={cn(
					"flex size-24 items-center justify-center rounded-full shadow-lg",
					good ? "bg-success" : "bg-destructive",
					result === "partiallyCorrect" && "bg-answer-yellow",
				)}
			>
				<Mark aria-hidden="true" className="size-14 stroke-3" />
			</span>
			{strip && (
				<p className="w-full max-w-sm rounded-md bg-black/40 px-4 py-3 font-bold text-lg">
					{strip}
				</p>
			)}
		</Centered>
	);
}

function QuestionIntro({
	stage,
	receivedAt,
}: {
	stage: PlayerStageData;
	receivedAt: number;
}) {
	const { seconds } = useCountdown(stage.remainingMs, receivedAt);

	return (
		<Centered>
			<h1 className="font-black text-4xl sm:text-5xl">
				Pergunta {stage.questionIndex + 1}
			</h1>
			<p
				role="timer"
				aria-label="Tempo de leitura"
				className="flex size-24 items-center justify-center rounded-full bg-white font-black text-5xl text-neutral-900 shadow-lg"
			>
				{seconds}
			</p>
			<p className="font-bold text-2xl">Preparar…</p>
		</Centered>
	);
}

/**
 * The player's device during the game (spec 009). It shows the phase the game
 * is in and what this player did in it: nothing here knows the question's
 * text, the answers' texts or which one is right.
 */
export function PlayerStage({
	nickname,
	finished,
	stage,
	receivedAt,
	late,
	notice,
	onAnswer,
}: {
	nickname: string;
	/** Every question was played (RN-30). */
	finished: boolean;
	stage: PlayerStageData | null;
	/** When `stage` arrived, by this device's clock. */
	receivedAt: number;
	/** The answer to this question was refused for arriving past the time (RN-20). */
	late: boolean;
	/** A failure to send the answer, to try again. */
	notice: string | null;
	onAnswer: (choiceIds: string[]) => void;
}) {
	if (finished) {
		return (
			<PlayerFrame nickname={nickname}>
				<Centered>
					<h1 className="font-black text-5xl">Fim do jogo</h1>
					<p className="font-bold text-2xl">Obrigado por jogar!</p>
				</Centered>
			</PlayerFrame>
		);
	}

	if (!stage || stage.phase === "gameIntro" || !stage.question) {
		return (
			<PlayerFrame nickname={nickname}>
				<Centered>
					<h1 className="font-black text-5xl">Prepare-se!</h1>
					<Spinner />
				</Centered>
			</PlayerFrame>
		);
	}

	const { question, phase } = stage;
	const frame = { nickname, question, questionNumber: stage.questionIndex + 1 };

	if (phase === "questionIntro") {
		return (
			<PlayerFrame {...frame}>
				<QuestionIntro stage={stage} receivedAt={receivedAt} />
			</PlayerFrame>
		);
	}

	if (phase === "results") {
		return (
			<PlayerFrame {...frame}>
				{stage.result ? (
					<ResultScreen result={stage.result} />
				) : (
					// The stage came by event; the result is on its way.
					<Centered>
						<Spinner />
					</Centered>
				)}
			</PlayerFrame>
		);
	}

	if (stage.answered) {
		return (
			<PlayerFrame {...frame}>
				<Centered>
					<Spinner />
					<p role="status" className="font-bold text-2xl">
						{waitingPhrase(stage.questionIndex)}
					</p>
				</Centered>
			</PlayerFrame>
		);
	}

	if (late) {
		return (
			<PlayerFrame {...frame}>
				<ResultScreen result="timeout" />
			</PlayerFrame>
		);
	}

	return (
		<PlayerFrame {...frame} notice={notice}>
			<AnswerButtons
				// A new question starts with nothing marked.
				key={stage.questionIndex}
				question={question}
				onAnswer={onAnswer}
			/>
		</PlayerFrame>
	);
}
