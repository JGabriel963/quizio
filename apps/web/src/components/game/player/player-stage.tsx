import { cn } from "@quizio/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";

import type {
	PlayerFinalData,
	PlayerOutcomeData,
	PlayerResultData,
	PlayerStageData,
} from "@/lib/api-types";
import { CountUp } from "@/lib/count-up";
import { positionMessage, waitingPhrase } from "@/lib/game-stage";
import { useCountdown } from "@/lib/use-countdown";

import { AnswerButtons } from "./answer-buttons";
import { FinalScreen } from "./final-screen";
import { Centered, PlayerFrame, Spinner } from "./player-frame";
import { DeviceQuestion, DeviceQuestionIntro } from "./question-on-device";

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
					"flex size-24 items-center justify-center rounded-full shadow-lg motion-safe:animate-pop-in",
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
					<CountUp
						data-slot="answer-points"
						prefix="+ "
						from={0}
						value={outcome.points}
					/>
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
 * Who got in after a question's answers opened: it is not theirs to answer,
 * and it leaves them no result (spec 012, RN-13, RN-14).
 */
function JoinedInTheMiddle() {
	return (
		<Centered>
			<h1 className="font-black text-4xl motion-safe:animate-pop-in sm:text-5xl">
				Você entrou!
			</h1>
			<p role="status" className="font-bold text-xl">
				Aguarde a próxima pergunta.
			</p>
		</Centered>
	);
}

/**
 * The player's device during the game (specs 009 and 010). It shows the phase
 * the game is in and what this player did in it. Nothing here knows which
 * answer is right; the question's text, its image and the answers' texts only
 * come when the host shows the questions on the devices (spec 012, RN-18).
 */
export function PlayerStage({
	nickname,
	finished,
	final,
	stage,
	receivedAt,
	late,
	notice,
	onAnswer,
	onLeave,
}: {
	nickname: string;
	/** Every question was played (RN-30). */
	finished: boolean;
	/** How the game ended for this player; null until the session tells (spec 011). */
	final: PlayerFinalData | null;
	stage: PlayerStageData | null;
	/** When `stage` arrived, by this device's clock. */
	receivedAt: number;
	/** The answer to this question was refused for arriving past the time (RN-20). */
	late: boolean;
	/** A failure to send the answer, to try again. */
	notice: string | null;
	onAnswer: (choiceIds: string[]) => void;
	/** "Entrar em outro jogo", from the final screen. */
	onLeave: () => void;
}) {
	if (finished) {
		return (
			<FinalScreen
				nickname={nickname}
				final={final}
				receivedAt={receivedAt}
				onLeave={onLeave}
			/>
		);
	}

	const total = stage?.total ?? 0;
	if (stage?.sittingOut) {
		return (
			<PlayerFrame nickname={nickname} total={total}>
				<JoinedInTheMiddle />
			</PlayerFrame>
		);
	}
	if (!stage || stage.phase === "gameIntro" || !stage.question) {
		return (
			<PlayerFrame nickname={nickname} total={total}>
				<Centered>
					<h1 className="font-black text-5xl">Prepare-se!</h1>
					<Spinner />
					<p role="status" className="font-bold text-xl">
						Carregando…
					</p>
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
				{question.text === null ? (
					<QuestionIntro stage={stage} receivedAt={receivedAt} />
				) : (
					<DeviceQuestionIntro
						stage={stage}
						text={question.text}
						receivedAt={receivedAt}
					/>
				)}
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

	const answerButtons = (
		<AnswerButtons
			// A new question starts with nothing marked.
			key={stage.questionIndex}
			question={question}
			onAnswer={onAnswer}
		/>
	);
	return (
		<PlayerFrame {...frame} notice={notice}>
			{question.text === null ? (
				answerButtons
			) : (
				<DeviceQuestion
					stage={stage}
					question={question}
					receivedAt={receivedAt}
				>
					{answerButtons}
				</DeviceQuestion>
			)}
		</PlayerFrame>
	);
}
