import {
	GAME_EVENTS,
	gameChannel,
	type PlayerRemovedPayload,
} from "@quizio/core/game/domain/game-events";
import { parseGamePin } from "@quizio/core/game/domain/game-pin";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { PlayerSessionData } from "@/lib/api-types";
import {
	GAME_ENDED_MESSAGE,
	gameErrorCode,
	gameErrorMessage,
	REMOVED_FROM_GAME_MESSAGE,
} from "@/lib/game-error-messages";
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

/** What the player's flow asks of the API; the route wires it to tRPC (spec 008). */
export interface JoinApi {
	find(pin: string): Promise<{ gameId: string; pin: string }>;
	enter(input: {
		gameId: string;
		nickname: string;
	}): Promise<{ playerId: string; secret: string; nickname: string }>;
	session(input: StoredPlayerSession): Promise<PlayerSessionData>;
}

interface FoundGame {
	gameId: string;
	pin: string;
}

type Step =
	| { kind: "pin"; notice: string | null; invalid: boolean }
	/** A join link or a reload is being checked with the server. */
	| { kind: "resolving" }
	| { kind: "nickname"; game: FoundGame; error: string | null }
	| {
			kind: "waiting";
			game: FoundGame;
			session: StoredPlayerSession;
			nickname: string;
	  };

/** How often a waiting device asks the server where it stands (ADR 0009). */
export const SESSION_CHECK_INTERVAL_MS = 15_000;

const PIN_NOT_RECOGNIZED = "GAME.PIN_NOT_RECOGNIZED";

const pinStep = (notice: string | null = null, invalid = false): Step => ({
	kind: "pin",
	notice,
	invalid,
});

/**
 * The player's way in: PIN, nickname, then waiting (spec 008, RN-35 to RN-46).
 * The PIN in the address (`/join/{PIN}`) skips the first step and, with the
 * session the browser kept, brings a reload back to the waiting screen.
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
	/** The PIN the current step came from, so the address following it is not resolved again. */
	const resolvedPin = useRef<string | null>(null);

	/** Where a PIN leads: back to the waiting screen, to the nickname, or nowhere. */
	async function resolve(rawPin: string): Promise<Step> {
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
				if (view.status === "waiting") {
					return {
						kind: "waiting",
						game: { gameId: stored.gameId, pin: parsed },
						session: stored,
						nickname: view.nickname,
					};
				}
				store.clear(parsed);
				return pinStep(
					view.status === "removed"
						? REMOVED_FROM_GAME_MESSAGE
						: GAME_ENDED_MESSAGE,
				);
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
			const next = await resolve(addressPin);
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

	const waiting = step.kind === "waiting" ? step : null;
	const channel = waiting ? gameChannel(waiting.game.gameId) : null;
	const playerId = waiting?.session.playerId ?? null;

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
			}
		} catch (error) {
			// The game is gone with its quiz; a network failure just waits for the next check.
			if (gameErrorCode(error) === "GAME.NOT_FOUND") {
				leave(GAME_ENDED_MESSAGE);
			}
		}
	});

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
		const timer = setInterval(check, SESSION_CHECK_INTERVAL_MS);
		window.addEventListener("online", check);
		window.addEventListener("focus", check);
		document.addEventListener("visibilitychange", whenVisible);
		return () => {
			clearInterval(timer);
			window.removeEventListener("online", check);
			window.removeEventListener("focus", check);
			document.removeEventListener("visibilitychange", whenVisible);
		};
	}, [playerId]);

	async function submitPin(rawPin: string) {
		setBusy(true);
		const next = await resolve(rawPin);
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
			setStep({ kind: "waiting", game, session, nickname: joined.nickname });
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
		case "waiting":
			return <WaitingScreen nickname={step.nickname} />;
	}
}
