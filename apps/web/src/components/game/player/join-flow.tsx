import {
	GAME_EVENTS,
	gameChannel,
	type PlayerRemovedPayload,
	type StageChangedPayload,
} from "@quizio/core/game/domain/game-events";
import { parseGamePin } from "@quizio/core/game/domain/game-pin";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { PlayerSessionData, PlayerStageData } from "@/lib/api-types";
import {
	GAME_ENDED_MESSAGE,
	gameErrorCode,
	gameErrorMessage,
	REMOVED_FROM_GAME_MESSAGE,
} from "@/lib/game-error-messages";
import { stageOrder } from "@/lib/game-stage";
import type {
	PlayerSessionStore,
	StoredPlayerSession,
} from "@/lib/player-session";
import { useRealtimeEvent } from "@/lib/realtime";

import {
	JoinLoading,
	NicknameForm,
	PinForm,
	WaitingScreen,
} from "./join-forms";
import { PlayerStage } from "./player-stage";

/** What the player's flow asks of the API; the route wires it to tRPC (specs 008, 009). */
export interface JoinApi {
	find(pin: string): Promise<{ gameId: string; pin: string }>;
	enter(input: {
		gameId: string;
		nickname: string;
	}): Promise<{ playerId: string; secret: string; nickname: string }>;
	session(input: StoredPlayerSession): Promise<PlayerSessionData>;
	answer(
		input: StoredPlayerSession & { questionIndex: number; choiceIds: string[] },
	): Promise<unknown>;
}

interface FoundGame {
	gameId: string;
	pin: string;
}

/** The game after the lobby, as this device last knew it (spec 009). */
interface PlayView {
	finished: boolean;
	stage: PlayerStageData | null;
	/** This device's clock when the stage arrived: countdowns start from it. */
	receivedAt: number;
}

type Step =
	| { kind: "pin"; notice: string | null; invalid: boolean }
	/** A join link or a reload is being checked with the server. */
	| { kind: "resolving" }
	| { kind: "nickname"; game: FoundGame; error: string | null }
	| {
			/** In the game: waiting in the lobby while `play` is null, playing after. */
			kind: "waiting";
			game: FoundGame;
			session: StoredPlayerSession;
			nickname: string;
			play: PlayView | null;
	  };

/** How often a waiting device asks the server where it stands (ADR 0009). */
export const SESSION_CHECK_INTERVAL_MS = 15_000;
/** During the game the phases are short, so the device asks more often (spec 009, RN-33). */
export const PLAY_CHECK_INTERVAL_MS = 5_000;

const PIN_NOT_RECOGNIZED = "GAME.PIN_NOT_RECOGNIZED";

const pinStep = (notice: string | null = null, invalid = false): Step => ({
	kind: "pin",
	notice,
	invalid,
});

/** What the session says about the game after the lobby; null while still in it. */
function toPlay(view: PlayerSessionData): PlayView | null {
	if (view.status !== "playing" && view.status !== "finished") {
		return null;
	}
	return {
		finished: view.status === "finished",
		stage: view.stage,
		receivedAt: Date.now(),
	};
}

/** A game only goes forward: whether `next` is ahead of what the device shows. */
function isAhead(current: PlayView | null, next: PlayView): boolean {
	if (!current || current.finished) {
		return !current;
	}
	if (next.finished || !current.stage || !next.stage) {
		return true;
	}
	return stageOrder(next.stage) > stageOrder(current.stage);
}

/**
 * What the session said, over what the device shows. The answer may be older
 * than what an event already showed (it left before the game moved on), and
 * may not know yet of an answer just sent.
 */
function mergePlay(
	current: PlayView | null,
	next: PlayView | null,
): PlayView | null {
	if (!next || !current) {
		return next ?? current;
	}
	if (current.finished) {
		return current;
	}
	if (next.finished || !current.stage || !next.stage) {
		return next;
	}
	if (stageOrder(next.stage) < stageOrder(current.stage)) {
		return current;
	}
	const sameQuestion = next.stage.questionIndex === current.stage.questionIndex;
	return {
		...next,
		stage: {
			...next.stage,
			answered: next.stage.answered || (sameQuestion && current.stage.answered),
		},
	};
}

/**
 * The player's way in and through the game: PIN, nickname, waiting, then the
 * game itself (spec 008, RN-35 to RN-46; spec 009). The PIN in the address
 * (`/join/{PIN}`) skips the first step and, with the session the browser kept,
 * brings a reload back to where the player was.
 */
export function JoinFlow({
	pin,
	api,
	store,
	onPinChange,
}: {
	/** The PIN in the address, if any. */
	pin: string | null;
	api: JoinApi;
	store: PlayerSessionStore;
	/** Keeps the address in step with the flow: the PIN once found, null back at the start. */
	onPinChange: (pin: string | null) => void;
}) {
	const [step, setStep] = useState<Step>(() =>
		pin ? { kind: "resolving" } : pinStep(),
	);
	const [busy, setBusy] = useState(false);
	/** The question whose answer the server refused for being late (spec 009, RN-20). */
	const [lateFor, setLateFor] = useState<number | null>(null);
	/** A failure to send the answer to that question. */
	const [answerFailure, setAnswerFailure] = useState<{
		questionIndex: number;
		message: string;
	} | null>(null);
	/** The PIN the current step came from, so the address following it is not resolved again. */
	const resolvedPin = useRef<string | null>(null);

	/**
	 * Where a PIN leads: back into the game, to the nickname, or nowhere.
	 * `typed` is a PIN the player has just written: a game that is over is not
	 * what they are after.
	 */
	async function resolve(rawPin: string, typed: boolean): Promise<Step> {
		const parsed = parseGamePin(rawPin);
		if (!parsed) {
			return pinStep(
				gameErrorMessage({ data: { domainCode: PIN_NOT_RECOGNIZED } }),
				true,
			);
		}

		const stored = store.load(parsed);
		if (stored) {
			try {
				const view = await api.session(stored);
				const inGame = view.status === "waiting" || view.status === "playing";
				// A reload after the last question still shows the end of the game.
				if (inGame || (view.status === "finished" && !typed)) {
					return {
						kind: "waiting",
						game: { gameId: stored.gameId, pin: parsed },
						session: stored,
						nickname: view.nickname,
						play: toPlay(view),
					};
				}
				store.clear(parsed);
				if (view.status !== "finished") {
					return pinStep(
						view.status === "removed"
							? REMOVED_FROM_GAME_MESSAGE
							: GAME_ENDED_MESSAGE,
					);
				}
			} catch (error) {
				if (gameErrorCode(error) !== "GAME.NOT_FOUND") {
					return pinStep(gameErrorMessage(error));
				}
				// The PIN now belongs to another game: this session is of no use.
				store.clear(parsed);
			}
		}

		try {
			return { kind: "nickname", game: await api.find(parsed), error: null };
		} catch (error) {
			return pinStep(
				gameErrorMessage(error),
				gameErrorCode(error) === PIN_NOT_RECOGNIZED,
			);
		}
	}

	function show(next: Step, fromPin: string | null) {
		if (next.kind === "pin") {
			resolvedPin.current = null;
			onPinChange(null);
		} else if (fromPin) {
			resolvedPin.current = fromPin;
			onPinChange(fromPin);
		}
		setStep(next);
	}

	const followAddress = useEffectEvent(
		async (addressPin: string, isCancelled: () => boolean) => {
			const next = await resolve(addressPin, false);
			if (!isCancelled()) {
				show(next, parseGamePin(addressPin));
			}
		},
	);

	// A PIN that arrives in the address (join link, QR code, reload).
	useEffect(() => {
		if (!pin || resolvedPin.current === pin) {
			return;
		}
		let cancelled = false;
		resolvedPin.current = pin;
		setStep({ kind: "resolving" });
		void followAddress(pin, () => cancelled);
		return () => {
			cancelled = true;
			resolvedPin.current = null;
		};
	}, [pin]);

	/** Out of the game: back to the PIN, with the reason. */
	function leave(notice: string) {
		if (step.kind === "waiting" || step.kind === "nickname") {
			store.clear(step.game.pin);
		}
		show(pinStep(notice), null);
	}

	/** Changes what is known of the game, if the player is still in it. */
	function updatePlay(change: (play: PlayView | null) => PlayView | null) {
		setStep((current) =>
			current.kind === "waiting"
				? { ...current, play: change(current.play) }
				: current,
		);
	}

	const waiting = step.kind === "waiting" ? step : null;
	const channel = waiting ? gameChannel(waiting.game.gameId) : null;
	const playerId = waiting?.session.playerId ?? null;
	const playing = waiting?.play != null && !waiting.play.finished;

	useRealtimeEvent<PlayerRemovedPayload>(
		channel,
		GAME_EVENTS.playerRemoved,
		(payload) => {
			if (payload.playerId === playerId) {
				leave(REMOVED_FROM_GAME_MESSAGE);
			}
		},
	);
	useRealtimeEvent(channel, GAME_EVENTS.gameEnded, () =>
		leave(GAME_ENDED_MESSAGE),
	);
	// Events are hints: the device also asks, for what it missed while offline.
	const checkSession = useEffectEvent(async () => {
		if (!waiting) {
			return;
		}
		try {
			const view = await api.session(waiting.session);
			if (view.status === "removed") {
				leave(REMOVED_FROM_GAME_MESSAGE);
			} else if (view.status === "ended") {
				leave(GAME_ENDED_MESSAGE);
			} else {
				const next = toPlay(view);
				updatePlay((current) => mergePlay(current, next));
			}
		} catch (error) {
			// The game is gone with its quiz; a network failure just waits for the next check.
			if (gameErrorCode(error) === "GAME.NOT_FOUND") {
				leave(GAME_ENDED_MESSAGE);
			}
		}
	});

	// The event has the buttons to show; what is this player's alone (did they
	// answer, were they right) comes from the session.
	useRealtimeEvent<StageChangedPayload>(
		channel,
		GAME_EVENTS.stageChanged,
		({ status, stage }) => {
			const receivedAt = Date.now();
			if (status === "finished") {
				updatePlay(() => ({ finished: true, stage: null, receivedAt }));
				return;
			}
			if (status !== "playing" || !stage) {
				return;
			}
			const next: PlayView = {
				finished: false,
				stage: {
					...stage,
					remainingMs: stage.durationMs,
					answered: false,
					total: 0,
					outcome: null,
				},
				receivedAt,
			};
			updatePlay((current) => {
				if (!isAhead(current, next) || !next.stage) {
					return current;
				}
				// What is this player's alone stays as the device knows it: the
				// total always, and within the same question the answer already
				// sent and its outcome (the scoreboard comes after the results).
				const known = current?.stage;
				const sameQuestion = known?.questionIndex === next.stage.questionIndex;
				return {
					...next,
					stage: {
						...next.stage,
						answered: sameQuestion && (known?.answered ?? false),
						total: known?.total ?? 0,
						outcome: sameQuestion ? (known?.outcome ?? null) : null,
					},
				};
			});
			// Points, streak and place are never in an event (spec 010).
			if (stage.phase === "results" || stage.phase === "scoreboard") {
				void checkSession();
			}
		},
	);

	const checkInterval = playing
		? PLAY_CHECK_INTERVAL_MS
		: SESSION_CHECK_INTERVAL_MS;
	useEffect(() => {
		if (!playerId) {
			return;
		}
		const check = () => void checkSession();
		const whenVisible = () => {
			if (document.visibilityState === "visible") {
				check();
			}
		};
		const timer = setInterval(check, checkInterval);
		window.addEventListener("online", check);
		window.addEventListener("focus", check);
		document.addEventListener("visibilitychange", whenVisible);
		return () => {
			clearInterval(timer);
			window.removeEventListener("online", check);
			window.removeEventListener("focus", check);
			document.removeEventListener("visibilitychange", whenVisible);
		};
	}, [playerId, checkInterval]);

	async function submitPin(rawPin: string) {
		setBusy(true);
		const next = await resolve(rawPin, true);
		setBusy(false);
		show(next, parseGamePin(rawPin));
	}

	async function submitNickname(game: FoundGame, nickname: string) {
		setBusy(true);
		try {
			const joined = await api.enter({ gameId: game.gameId, nickname });
			const session = {
				gameId: game.gameId,
				playerId: joined.playerId,
				secret: joined.secret,
			};
			store.save(game.pin, session);
			setStep({
				kind: "waiting",
				game,
				session,
				nickname: joined.nickname,
				play: null,
			});
		} catch (error) {
			if (gameErrorCode(error) === PIN_NOT_RECOGNIZED) {
				// The game ended while the nickname was being typed.
				leave(gameErrorMessage(error));
			} else {
				setStep({ kind: "nickname", game, error: gameErrorMessage(error) });
			}
		} finally {
			setBusy(false);
		}
	}

	/** Marks the question as answered, or not, on this device. */
	function markAnswered(questionIndex: number, answered: boolean) {
		updatePlay((current) =>
			current?.stage?.questionIndex === questionIndex
				? { ...current, stage: { ...current.stage, answered } }
				: current,
		);
	}

	/**
	 * Sends the answer. The waiting screen shows at once; the server may still
	 * refuse it for arriving late, which the player is told (spec 009, RN-20).
	 */
	async function submitAnswer(choiceIds: string[]) {
		const stage = waiting?.play?.stage;
		if (!waiting || !stage) {
			return;
		}
		const { questionIndex } = stage;
		setAnswerFailure(null);
		markAnswered(questionIndex, true);
		try {
			await api.answer({ ...waiting.session, questionIndex, choiceIds });
		} catch (error) {
			const code = gameErrorCode(error);
			if (code === "GAME.ALREADY_ANSWERED") {
				return;
			}
			markAnswered(questionIndex, false);
			if (code === "GAME.ANSWERS_CLOSED") {
				setLateFor(questionIndex);
			} else if (code === "GAME.NOT_FOUND") {
				void checkSession();
			} else {
				setAnswerFailure({ questionIndex, message: gameErrorMessage(error) });
			}
		}
	}

	switch (step.kind) {
		case "resolving":
			return <JoinLoading />;
		case "pin":
			return (
				<PinForm
					notice={step.notice}
					invalid={step.invalid}
					busy={busy}
					onSubmit={submitPin}
				/>
			);
		case "nickname":
			return (
				<NicknameForm
					error={step.error}
					busy={busy}
					onSubmit={(nickname) => submitNickname(step.game, nickname)}
				/>
			);
		case "waiting": {
			const { play } = step;
			if (!play) {
				return <WaitingScreen nickname={step.nickname} />;
			}
			const questionIndex = play.stage?.questionIndex ?? null;
			return (
				<PlayerStage
					nickname={step.nickname}
					finished={play.finished}
					stage={play.stage}
					receivedAt={play.receivedAt}
					late={questionIndex !== null && lateFor === questionIndex}
					notice={
						answerFailure?.questionIndex === questionIndex
							? answerFailure.message
							: null
					}
					onAnswer={submitAnswer}
				/>
			);
		}
	}
}
