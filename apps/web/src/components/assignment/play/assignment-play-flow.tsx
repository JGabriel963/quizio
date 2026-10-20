import type { Avatar } from "@quizio/core/game/domain/avatar";
import type { ParticipantPhase } from "@quizio/core/game/domain/participant-progress";
import { useEffect, useEffectEvent, useState } from "react";

import { AssignmentLanding } from "@/components/assignment/assignment-landing";
import { GameScreen } from "@/components/game/game-screen";
import type { AssignmentCoverData, AssignmentPlayData } from "@/lib/api-types";
import type {
	AssignmentSessionStore,
	StoredAssignmentSession,
} from "@/lib/assignment-session";
import { isConnectionFailure } from "@/lib/connection";
import {
	ANSWER_NOT_SENT_MESSAGE,
	gameErrorCode,
	gameErrorMessage,
} from "@/lib/game-error-messages";

import { AssignmentCover, NicknameStep, ReadyScreen } from "./entry-screens";
import { PlayArrows } from "./play-arrows";
import { PlayFinal } from "./play-final";
import { PlayQuestion } from "./play-question";
import { PlayResult } from "./play-result";
import { PlayScoreboard } from "./play-scoreboard";
import { PLAY_AREA_CLASS, PlayCard, ProgressSegments } from "./play-stage";

/** What the participant's flow asks of the API; the route wires it to tRPC (spec 030). */
export interface AssignmentPlayApi {
	cover(gameId: string): Promise<AssignmentCoverData>;
	join(input: {
		gameId: string;
		nickname: string;
		avatar: Avatar | null;
	}): Promise<{ playerId: string; secret: string; nickname: string }>;
	play(session: StoredAssignmentSession): Promise<AssignmentPlayData>;
	start(session: StoredAssignmentSession): Promise<AssignmentPlayData>;
	answer(
		input: StoredAssignmentSession & {
			questionIndex: number;
			choiceIds: string[];
		},
	): Promise<AssignmentPlayData>;
	advance(
		input: StoredAssignmentSession & {
			from: { questionIndex: number; phase: ParticipantPhase };
		},
	): Promise<AssignmentPlayData>;
	setAvatar(
		input: StoredAssignmentSession & { avatar: Avatar },
	): Promise<{ avatar: Avatar }>;
}

/** How often the activity's cover asks again: the deadline may change or end (spec 029, RN-37). */
export const COVER_CHECK_INTERVAL_MS = 30_000;
/** A device without connection asks again after this long (spec 013). */
export const PLAY_RETRY_MS = 5_000;
/** Past the deadline itself, so the server already settled the question. */
const DEADLINE_MARGIN_MS = 250;

type CoverState =
	| { kind: "loading" }
	| { kind: "error" }
	| { kind: "missing" }
	| { kind: "ready"; cover: AssignmentCoverData };

type Step =
	| { kind: "cover" }
	| { kind: "nickname"; notice: string | null }
	| { kind: "play"; session: StoredAssignmentSession };

interface PlayState {
	view: AssignmentPlayData | null;
	/** This device's clock when the view arrived: countdowns start from it. */
	receivedAt: number;
	busy: boolean;
	/** Why the last answer did not go (spec 013, RN-23). */
	failure: string | null;
	/** The last request got no answer: the device asks again by itself. */
	lost: boolean;
}

const NO_PLAY: PlayState = {
	view: null,
	receivedAt: 0,
	busy: false,
	failure: null,
	lost: false,
};

/**
 * A participant's way through an assignment (spec 030): the cover, the
 * nickname, then the questions at their own pace. The browser keeps who the
 * participant is per activity, so opening the link again goes back to where
 * they were (RN-20); every screen is what the server says, asked again when a
 * question's time runs out (RN-21).
 */
export function AssignmentPlayFlow({
	gameId,
	api,
	store,
	onLeave,
}: {
	gameId: string;
	api: AssignmentPlayApi;
	store: AssignmentSessionStore;
	/** "Entrar em outro jogo": the PIN's screen (RN-18). */
	onLeave: () => void;
}) {
	const [step, setStep] = useState<Step>(() => {
		const session = store.load(gameId);
		return session ? { kind: "play", session } : { kind: "cover" };
	});
	const [coverState, setCoverState] = useState<CoverState>({ kind: "loading" });
	const [joining, setJoining] = useState(false);
	const [play, setPlay] = useState<PlayState>(NO_PLAY);
	const session = step.kind === "play" ? step.session : null;

	const loadCover = useEffectEvent(async () => {
		try {
			setCoverState({ kind: "ready", cover: await api.cover(gameId) });
		} catch (error) {
			setCoverState(
				gameErrorCode(error) === "GAME.NOT_FOUND"
					? { kind: "missing" }
					: { kind: "error" },
			);
		}
	});

	useEffect(() => {
		if (step.kind === "play") {
			return;
		}
		void loadCover();
		const timer = setInterval(() => void loadCover(), COVER_CHECK_INTERVAL_MS);
		return () => clearInterval(timer);
	}, [step.kind]);

	const show = (view: AssignmentPlayData) =>
		setPlay({
			view,
			receivedAt: Date.now(),
			busy: false,
			failure: null,
			lost: false,
		});

	const load = useEffectEvent(async () => {
		if (!session) {
			return;
		}
		try {
			show(await api.play(session));
		} catch (error) {
			if (gameErrorCode(error) === "GAME.NOT_FOUND") {
				// The participant this browser had is not there anymore: back to the cover.
				store.clear(gameId);
				setPlay(NO_PLAY);
				setStep({ kind: "cover" });
				return;
			}
			setPlay((current) => ({ ...current, busy: false, lost: true }));
		}
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: a new participant loads again
	useEffect(() => {
		void load();
	}, [session?.playerId]);

	// A question whose time ran out: the server has settled it by now.
	const view = play.view;
	const deadlineIn =
		view?.screen.phase === "answering" ? view.screen.remainingMs : null;
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new reading starts the wait again
	useEffect(() => {
		if (deadlineIn === null) {
			return;
		}
		const timer = setTimeout(
			() => void load(),
			deadlineIn + DEADLINE_MARGIN_MS,
		);
		return () => clearTimeout(timer);
	}, [deadlineIn, play.receivedAt]);

	useEffect(() => {
		if (!play.lost) {
			return;
		}
		const timer = setTimeout(() => void load(), PLAY_RETRY_MS);
		return () => clearTimeout(timer);
	}, [play.lost]);

	/** A step of the participant: what comes back is the next screen. */
	async function act(
		request: () => Promise<AssignmentPlayData>,
		onConnectionFailure?: () => void,
	) {
		setPlay((current) => ({ ...current, busy: true, failure: null }));
		try {
			show(await request());
		} catch (error) {
			if (isConnectionFailure(error)) {
				if (onConnectionFailure) {
					onConnectionFailure();
				} else {
					setPlay((current) => ({ ...current, busy: false, lost: true }));
				}
				return;
			}
			// Refused: the screen was behind the server, which says where it is.
			await load();
		}
	}

	async function join(nickname: string) {
		setJoining(true);
		try {
			const joined = await api.join({ gameId, nickname, avatar: null });
			const stored = {
				gameId,
				playerId: joined.playerId,
				secret: joined.secret,
			};
			store.save(stored);
			setStep({ kind: "play", session: stored });
		} catch (error) {
			setStep({ kind: "nickname", notice: gameErrorMessage(error) });
		} finally {
			setJoining(false);
		}
	}

	if (!session) {
		if (coverState.kind !== "ready") {
			return (
				<AssignmentLanding
					state={
						coverState.kind === "error"
							? { kind: "error", onRetry: () => void loadCover() }
							: coverState
					}
				/>
			);
		}
		const { cover } = coverState;
		if (cover.status === "ended") {
			return <AssignmentLanding state={{ kind: "ended", name: cover.name }} />;
		}
		return step.kind === "nickname" ? (
			<NicknameStep
				cover={cover}
				busy={joining}
				notice={step.notice}
				onSubmit={(nickname) => void join(nickname)}
			/>
		) : (
			<AssignmentCover
				cover={cover}
				onStart={() => setStep({ kind: "nickname", notice: null })}
			/>
		);
	}

	if (!view) {
		return (
			<AssignmentLanding
				state={
					play.lost
						? { kind: "error", onRetry: () => void load() }
						: { kind: "loading" }
				}
			/>
		);
	}

	const { screen } = view;
	if (screen.phase === "ready") {
		return (
			<ReadyScreen
				nickname={view.nickname}
				avatar={view.avatar ?? { character: "fox", accessory: null }}
				busy={play.busy}
				onChange={async (avatar) => {
					const changed = await api.setAvatar({ ...session, avatar });
					setPlay((current) =>
						current.view
							? {
									...current,
									view: { ...current.view, avatar: changed.avatar },
								}
							: current,
					);
				}}
				onStart={() => void act(() => api.start(session))}
			/>
		);
	}

	const from =
		screen.phase === "results"
			? { questionIndex: screen.result.question.index, phase: screen.phase }
			: screen.phase === "scoreboard"
				? { questionIndex: screen.questionIndex, phase: screen.phase }
				: null;

	return (
		<GameScreen className="flex h-svh flex-col">
			{play.lost && (
				<p
					role="status"
					className="shrink-0 bg-black/60 px-3 py-2 text-center font-bold"
				>
					Sem conexão. Tentando novamente…
				</p>
			)}
			{screen.phase === "answering" ? (
				<div className={PLAY_AREA_CLASS}>
					<PlayQuestion
						question={screen.question}
						questionCount={view.questionCount}
						remainingMs={screen.remainingMs}
						durationMs={screen.durationMs}
						receivedAt={play.receivedAt}
						failure={play.failure}
						onAnswer={(choiceIds) =>
							void act(
								() =>
									api.answer({
										...session,
										questionIndex: screen.question.index,
										choiceIds,
									}),
								() =>
									setPlay((current) => ({
										...current,
										busy: false,
										failure: ANSWER_NOT_SENT_MESSAGE,
									})),
							)
						}
					/>
				</div>
			) : (
				<PlayArrows
					screen={{
						phase: screen.phase,
						questionIndex: from?.questionIndex ?? view.questionCount - 1,
					}}
					history={view.history}
					questionCount={view.questionCount}
					busy={play.busy}
					onAdvance={() => {
						if (from) {
							void act(() => api.advance({ ...session, from }));
						}
					}}
				>
					{screen.phase === "results" ? (
						<PlayResult
							result={screen.result}
							questionCount={view.questionCount}
						/>
					) : screen.phase === "scoreboard" ? (
						<>
							<ProgressSegments
								index={screen.questionIndex}
								count={view.questionCount}
							/>
							<PlayCard className="items-center justify-center gap-6 overflow-y-auto px-4 py-8 motion-safe:animate-stage-in">
								<h1 className="font-black text-3xl">Pontuações</h1>
								<PlayScoreboard
									scoreboard={screen.scoreboard}
									viewerId={session.playerId}
								/>
							</PlayCard>
						</>
					) : (
						<PlayFinal
							activity={view.activity}
							place={screen.place}
							total={screen.total}
							scoreboard={screen.scoreboard}
							viewerId={session.playerId}
							endedEarly={view.endedEarly}
							onLeave={onLeave}
						/>
					)}
				</PlayArrows>
			)}
		</GameScreen>
	);
}
