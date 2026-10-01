import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { QuestionTypeIcon } from "@/components/editor/question-type-icon";
import type {
	PlayerOutcomeData,
	PlayerQuestionData,
	PlayerResultData,
	PlayerStageData,
} from "@/lib/api-types";
import { positionMessage, waitingPhrase } from "@/lib/game-stage";
import { questionTypeLabel } from "@/lib/quiz-labels";
import { useCountdown } from "@/lib/use-countdown";

import { GameScreen } from "../game-screen";
import { AnswerButtons } from "./answer-buttons";
import { JoinNotice } from "./join-forms";

/**
 * The frame of the player's game screens: the question on top, the nickname
 * and the total of points at the bottom (spec 010, RN-16).
 */
function PlayerFrame({
	nickname,
	total,
	questionNumber,
	question,
	notice = null,
	children,
}: {
	nickname: string;
	/** Null where there is no game going on to have points in. */
	total: number | null;
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
			<footer className="flex h-12 shrink-0 items-center gap-3 bg-black/40 px-4">
				<span data-slot="player-nickname" className="truncate font-bold">
					{nickname}
				</span>
				{total !== null && (
					<span className="rounded bg-black/40 px-2 py-0.5 font-bold text-sm">
						<span className="sr-only">Pontos: </span>
						<span data-slot="player-total">{total}</span>
					</span>
				)}
			</footer>
			<JoinNotice message={notice} />
		</GameScreen>
	);
}

function Centered({ children }: { children: ReactNode }) {
	return (
		<main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
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

const stripClass =
	"w-full max-w-sm rounded-md bg-black/40 px-4 py-3 font-bold text-lg";

/**
 * How the player did: the result, what it was worth and where it leaves them,
 * never which answer was right (spec 009, RN-25, RN-26; spec 010, RN-12 to
 * RN-15). `outcome` is missing when the device itself knows the answer was
 * late, before the results are out.
 */
function ResultScreen({
	result,
	outcome = null,
}: {
	result: PlayerResultData;
	outcome?: PlayerOutcomeData | null;
}) {
	const { title, good, strip } = RESULTS[result];
	const Mark = good ? CheckIcon : XIcon;
	const position = outcome ? positionMessage(outcome) : null;

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
			{good && outcome && outcome.streak > 0 && (
				<p className="flex items-center gap-2 font-bold">
					Sequência de respostas
					<span
						data-slot="answer-streak"
						className="flex size-7 items-center justify-center rounded-full bg-orange-500 font-black text-sm"
					>
						{outcome.streak}
					</span>
				</p>
			)}
			{good && outcome && outcome.points !== null && (
				<p className={cn(stripClass, "font-black text-2xl")}>
					<span className="sr-only">Pontos ganhos: </span>
					<span data-slot="answer-points">+ {outcome.points}</span>
				</p>
			)}
			{strip && <p className={stripClass}>{strip}</p>}
			{position && (
				<p data-slot="player-position" className="font-bold">
					{position.title}
					{position.detail && (
						<span className="block font-semibold text-sm">
							{position.detail}
						</span>
					)}
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
 * The player's device during the game (specs 009 and 010). It shows the phase
 * the game is in and what this player did in it: nothing here knows the
 * question's text, the answers' texts or which one is right.
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
			<PlayerFrame nickname={nickname} total={null}>
				<Centered>
					<h1 className="font-black text-5xl">Fim do jogo</h1>
					<p className="font-bold text-2xl">Obrigado por jogar!</p>
				</Centered>
			</PlayerFrame>
		);
	}

	const total = stage?.total ?? 0;
	if (!stage || stage.phase === "gameIntro" || !stage.question) {
		return (
			<PlayerFrame nickname={nickname} total={total}>
				<Centered>
					<h1 className="font-black text-5xl">Prepare-se!</h1>
					<Spinner />
				</Centered>
			</PlayerFrame>
		);
	}

	const { question, phase } = stage;
	const frame = {
		nickname,
		total,
		question,
		questionNumber: stage.questionIndex + 1,
	};

	if (phase === "questionIntro") {
		return (
			<PlayerFrame {...frame}>
				<QuestionIntro stage={stage} receivedAt={receivedAt} />
			</PlayerFrame>
		);
	}

	// The host's scoreboard is for the big screen: the phone keeps the result (RN-21).
	if (phase === "results" || phase === "scoreboard") {
		return (
			<PlayerFrame {...frame}>
				{stage.outcome ? (
					<ResultScreen result={stage.outcome.result} outcome={stage.outcome} />
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
