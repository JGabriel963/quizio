import type { QuestionType, SelectionMode } from "../../quiz/domain/question";
import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { Answer, Correctness } from "../domain/answer";
import {
	type AssignmentScoreboard,
	assignmentScoreboard,
} from "../domain/assignment-scoreboard";
import type { Avatar } from "../domain/avatar";
import {
	type Game,
	GameNotFoundError,
	isGameOpen,
	requireAssignment,
} from "../domain/game";
import type { GameQuestion } from "../domain/game-question";
import {
	answerDeadline,
	finishProgress,
	type ParticipantProgress,
	settleProgress,
} from "../domain/participant-progress";
import {
	avatarShown,
	hasPlayerSecret,
	type Player,
	shownPlayers,
} from "../domain/player";
import type { PublicImage } from "../domain/public-stage";
import { rankPlayers } from "../domain/standings";
import { loadGame } from "./game-lifecycle";
import type { AnswerRepository } from "./ports/answer-repository";
import type { AssignmentLandingQuery } from "./ports/assignment-landing-query";
import type { GameQuestionRepository } from "./ports/game-question-repository";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

/** Who the participant is: what the browser kept on joining (RN-20). */
export interface ParticipantReference {
	gameId: string;
	playerId: string;
	secret: string;
}

/** An answer of the question as the participant sees it, in their order (RN-07). */
export interface PlayChoiceView {
	id: string;
	shapeIndex: number;
	text: string;
}

/** A question on the participant's screen: never which answer is right. */
export interface PlayQuestionView {
	index: number;
	type: QuestionType;
	selection: SelectionMode;
	text: string;
	image: PublicImage | null;
	choices: PlayChoiceView[];
}

/** A question once its results are out (RN-11): now the right answers travel. */
export interface QuestionResultView {
	question: PlayQuestionView;
	chosenIds: string[];
	rightIds: string[];
	result: Correctness | "unanswered";
	points: number;
}

export type AssignmentPlayScreen =
	| { phase: "ready" }
	| {
			phase: "answering";
			question: PlayQuestionView;
			/** Null without the question timer (RN-09). */
			remainingMs: number | null;
			/** The whole time of the question, for the bar; null without the timer. */
			durationMs: number | null;
	  }
	| { phase: "results"; result: QuestionResultView; total: number }
	| {
			phase: "scoreboard";
			questionIndex: number;
			scoreboard: AssignmentScoreboard;
	  }
	| {
			phase: "finished";
			place: number;
			total: number;
			scoreboard: AssignmentScoreboard;
	  };

/** Everything a participant's device draws (spec 030). */
export interface AssignmentPlayView {
	nickname: string;
	/** Null with "Personagens" off (spec 028). */
	avatar: Avatar | null;
	questionCount: number;
	activity: {
		name: string;
		creatorName: string;
		/** Null once the assignment is over. */
		remainingMs: number | null;
	};
	/** The assignment ended with the participant in the middle (RN-23). */
	endedEarly: boolean;
	screen: AssignmentPlayScreen;
	/** The questions already with results, for "←" (RN-12, RN-17). */
	history: QuestionResultView[];
}

export interface AssignmentPlayDeps {
	games: GameRepository;
	players: Pick<
		PlayerRepository,
		"findById" | "listActive" | "saveProgressIfAt"
	>;
	gameQuestions: Pick<GameQuestionRepository, "find">;
	answers: Pick<AnswerRepository, "listByPlayer" | "totalsThrough">;
	assignmentLanding: AssignmentLandingQuery;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
}

/** A participant of an assignment, where they really are now. */
export interface LoadedParticipant {
	game: Game;
	player: Player & { progress: ParticipantProgress };
	question: GameQuestion | null;
}

/**
 * Every request of a participant starts here (spec 030): the assignment, the
 * participant proven by the secret, and the progress settled by the server's
 * clock: a question whose time ran out goes to its results (RN-21), and an
 * assignment that is over finishes whoever was in the middle (RN-23). What
 * changed is stored on the way, only if nobody moved it first.
 */
export async function loadParticipant(
	deps: AssignmentPlayDeps,
	input: ParticipantReference,
): Promise<LoadedParticipant> {
	const stored = await loadGame(deps, input.gameId);
	if (!stored) {
		throw new GameNotFoundError("Assignment not found");
	}
	const game = requireAssignment(stored);
	const player = await deps.players.findById(input.playerId);
	if (
		!player ||
		player.gameId !== game.id ||
		!hasPlayerSecret(player, input.secret) ||
		!player.progress
	) {
		throw new GameNotFoundError("Participant not found");
	}
	const now = deps.clock.now();
	const question = await deps.gameQuestions.find(
		game.id,
		player.progress.questionIndex,
	);
	// Finished by the end itself, at the instant it ended: `endedEarly` tells
	// it from a participant who reached the end before (RN-23).
	const settled = !isGameOpen(game)
		? finishProgress(player.progress, game.endedAt ?? now)
		: question
			? settleProgress(game, question, player.progress, now)
			: player.progress;
	let progress = player.progress;
	if (settled !== player.progress) {
		const saved = await deps.players.saveProgressIfAt(
			player.id,
			player.progress,
			settled,
		);
		progress = saved
			? settled
			: ((await deps.players.findById(player.id))?.progress ?? settled);
	}
	return { game, player: { ...player, progress }, question };
}

function questionView(
	question: GameQuestion,
	player: Player,
	storage: Pick<ObjectStorage, "getPublicUrl">,
): PlayQuestionView {
	const order = player.choiceOrder?.[question.index];
	const byId = new Map(question.choices.map((choice) => [choice.id, choice]));
	const choices = order
		? order.flatMap((id) => {
				const choice = byId.get(id);
				return choice ? [choice] : [];
			})
		: question.choices;
	return {
		index: question.index,
		type: question.type,
		selection: question.selection,
		text: question.text,
		image: question.image
			? {
					url: storage.getPublicUrl(question.image.key),
					placement: question.image.placement,
					crop: question.image.crop,
					altText: question.image.altText,
				}
			: null,
		choices: choices.map(({ id, shapeIndex, text }) => ({
			id,
			shapeIndex,
			text,
		})),
	};
}

function resultView(
	question: GameQuestion,
	player: Player,
	answer: Answer | undefined,
	storage: Pick<ObjectStorage, "getPublicUrl">,
): QuestionResultView {
	return {
		question: questionView(question, player, storage),
		chosenIds: answer?.choiceIds ?? [],
		rightIds: question.choices
			.filter((choice) => choice.correct)
			.map(({ id }) => id),
		result: answer?.correctness ?? "unanswered",
		points: answer?.points ?? 0,
	};
}

/** Whether the question at `index` already has its results for the participant. */
function hasResults(
	index: number,
	progress: ParticipantProgress,
	answered: boolean,
	questionCount: number,
): boolean {
	if (index < progress.questionIndex) {
		return true;
	}
	if (index > progress.questionIndex) {
		return false;
	}
	return (
		progress.phase === "results" ||
		progress.phase === "scoreboard" ||
		(progress.phase === "finished" && (answered || index === questionCount - 1))
	);
}

/** What the participant's device draws, read from the stored rows. */
export async function buildAssignmentPlayView(
	deps: AssignmentPlayDeps,
	{ game, player, question }: LoadedParticipant,
): Promise<AssignmentPlayView> {
	const now = deps.clock.now();
	const { progress } = player;
	// Pontuações tells everybody's points up to the question it follows, as
	// in a live game (RN-14); the end, everybody's points of now.
	const through =
		progress.phase === "scoreboard"
			? progress.questionIndex
			: Math.max(0, game.questionCount - 1);
	const [answers, record, everyone, totals, totalsBefore] = await Promise.all([
		deps.answers.listByPlayer(game.id, player.id),
		deps.assignmentLanding.find(game.id),
		deps.players.listActive(game.id),
		deps.answers.totalsThrough(game.id, through),
		deps.answers.totalsThrough(game.id, through - 1),
	]);
	const answerOf = new Map(
		answers.map((answer) => [answer.questionIndex, answer]),
	);

	const history: QuestionResultView[] = [];
	for (let index = 0; index < game.questionCount; index++) {
		if (!hasResults(index, progress, answerOf.has(index), game.questionCount)) {
			continue;
		}
		const asked =
			index === question?.index
				? question
				: await deps.gameQuestions.find(game.id, index);
		if (asked) {
			history.push(
				resultView(asked, player, answerOf.get(index), deps.storage),
			);
		}
	}

	const total = answers.reduce((sum, answer) => sum + answer.points, 0);
	const players = shownPlayers(game, everyone);
	const standings = rankPlayers(players, totals);
	// As they were before that question: who climbed in it gets the arrow.
	const previous = rankPlayers(players, totalsBefore);
	const scoreboard = () => assignmentScoreboard(standings, previous, player.id);

	const open = isGameOpen(game);
	const screen = ((): AssignmentPlayScreen => {
		switch (progress.phase) {
			case "ready":
				return { phase: "ready" };
			case "answering": {
				if (!question) {
					throw new GameNotFoundError("Question not found");
				}
				const deadline = answerDeadline(game, question, progress);
				return {
					phase: "answering",
					question: questionView(question, player, deps.storage),
					remainingMs: deadline
						? Math.max(0, deadline.getTime() - now.getTime())
						: null,
					durationMs: game.questionTimer
						? question.timeLimitSeconds * 1000
						: null,
				};
			}
			case "results": {
				const current = history.find(
					(entry) => entry.question.index === progress.questionIndex,
				);
				if (!current) {
					throw new GameNotFoundError("Question not found");
				}
				return { phase: "results", result: current, total };
			}
			case "scoreboard":
				return {
					phase: "scoreboard",
					questionIndex: progress.questionIndex,
					scoreboard: scoreboard(),
				};
			case "finished":
				return {
					phase: "finished",
					place:
						standings.find(({ playerId }) => playerId === player.id)?.rank ??
						standings.length,
					total,
					scoreboard: scoreboard(),
				};
		}
	})();

	return {
		nickname: player.nickname,
		avatar: avatarShown(game, player),
		questionCount: game.questionCount,
		activity: {
			name: record?.name ?? game.title,
			creatorName: record?.creatorName ?? "",
			remainingMs: open
				? Math.max(0, game.expiresAt.getTime() - now.getTime())
				: null,
		},
		// Who reached the end did it while the activity was open; who was
		// finished by its end got the end's instant (`loadParticipant`).
		endedEarly:
			!open &&
			progress.phase === "finished" &&
			game.endedAt !== null &&
			progress.startedAt.getTime() >= game.endedAt.getTime(),
		screen,
		history,
	};
}
