import type { Avatar } from "@quizio/core/game/domain/avatar";
import { nicknameKeyOf } from "@quizio/core/game/domain/nickname";
import type { ParticipantPhase } from "@quizio/core/game/domain/participant-progress";
import { DEFAULT_THEME_ID } from "@quizio/core/shared/domain/theme";
import {
	type ReactNode,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";

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
import { GameThemeProvider } from "@/lib/game-theme";

import {
	AssignmentCover,
	ConfirmParticipant,
	NicknameStep,
	ReadyScreen,
} from "./entry-screens";
import { PlayArrows } from "./play-arrows";
import { PlayFinal } from "./play-final";
import { PlayQuestion } from "./play-question";
import { PlayResult, RESULT_SHOW_MS } from "./play-result";
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
			/** The marked answers, or the typed text of a type answer (spec 031). */
			/** Or the picked number of a slider (spec 032). */
		} & ({ choiceIds: string[] } | { text: string } | { value: number }),
	): Promise<AssignmentPlayData>;
	advance(
		input: StoredAssignmentSession & {
			from: { questionIndex: number; phase: ParticipantPhase };
		},
	): Promise<AssignmentPlayData>;
	setAvatar(
		input: StoredAssignmentSession & { avatar: Avatar },
	): Promise<{ avatar: Avatar }>;
	/** "Sim" to "Você é {apelido}?" (RN-20). */
	resume(input: {
		gameId: string;
		nickname: string;
	}): Promise<{ playerId: string; secret: string; nickname: string }>;
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
	/** "Você é {apelido}?": coming back, or a nickname already in (RN-03, RN-20). */
	| { kind: "confirm"; nickname: string; notice: string | null }
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
		if (!session) {
			return { kind: "cover" };
		}
		// Older sessions kept no nickname: they go straight back in.
		return session.nickname
			? { kind: "confirm", nickname: session.nickname, notice: null }
			: { kind: "play", session };
	});
	const [resuming, setResuming] = useState(false);
	// Who comes back already at the end sees it without ← (RN-22).
	const [reviewLocked, setReviewLocked] = useState(false);
	const entering = useRef(false);
	const [coverState, setCoverState] = useState<CoverState>({ kind: "loading" });
	const [joining, setJoining] = useState(false);
	const [play, setPlay] = useState<PlayState>(NO_PLAY);
	// What the server is told: the pair, never the nickname kept for "Você é…?".
	const session =
		step.kind === "play"
			? {
					gameId: step.session.gameId,
					playerId: step.session.playerId,
					secret: step.session.secret,
				}
			: null;

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

	const show = (view: AssignmentPlayData) => {
		if (entering.current) {
			entering.current = false;
			setReviewLocked(view.screen.phase === "finished");
		}
		setPlay({
			view,
			receivedAt: Date.now(),
			busy: false,
			failure: null,
			lost: false,
		});
	};

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

	// After the result's animation, Pontuações comes by itself (RN-12).
	const resultIndex =
		view?.screen.phase === "results" ? view.screen.result.question.index : null;
	const leaveResult = useEffectEvent((questionIndex: number) => {
		if (session) {
			void act(() =>
				api.advance({
					...session,
					from: { questionIndex, phase: "results" },
				}),
			);
		}
	});
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new reading starts the wait again
	useEffect(() => {
		if (resultIndex === null) {
			return;
		}
		const timer = setTimeout(() => leaveResult(resultIndex), RESULT_SHOW_MS);
		return () => clearTimeout(timer);
	}, [resultIndex, play.receivedAt]);

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
				nickname: joined.nickname,
			};
			store.save(stored);
			setStep({ kind: "play", session: stored });
		} catch (error) {
			setStep(
				gameErrorCode(error) === "GAME.NICKNAME_TAKEN"
					? { kind: "confirm", nickname: knownAs(nickname), notice: null }
					: { kind: "nickname", notice: gameErrorMessage(error) },
			);
		} finally {
			setJoining(false);
		}
	}

	/** The nickname as its participant wrote it, when the cover lists it. */
	function knownAs(typed: string): string {
		const key = nicknameKeyOf(typed.trim());
		const participants =
			coverState.kind === "ready" && coverState.cover.status === "open"
				? coverState.cover.participants
				: [];
		return (
			participants.find((nickname) => nicknameKeyOf(nickname) === key) ??
			typed.trim()
		);
	}

	/** "Sim": that participant, where they were (RN-20 to RN-22). */
	async function resume(nickname: string) {
		setResuming(true);
		try {
			const resumed = await api.resume({ gameId, nickname });
			const stored = {
				gameId,
				playerId: resumed.playerId,
				secret: resumed.secret,
				nickname: resumed.nickname,
			};
			store.save(stored);
			entering.current = true;
			setStep({ kind: "play", session: stored });
		} catch (error) {
			const code = gameErrorCode(error);
			if (code === "ASSIGNMENT.PARTICIPANT_NOT_FOUND") {
				store.clear(gameId);
				setStep({ kind: "nickname", notice: null });
			} else if (code === "GAME.NOT_FOUND") {
				store.clear(gameId);
				setStep({ kind: "cover" });
			} else {
				setStep({ kind: "confirm", nickname, notice: gameErrorMessage(error) });
			}
		} finally {
			setResuming(false);
		}
	}

	/** "Não": somebody else, with a nickname of their own (RN-20). */
	function startOver() {
		store.clear(gameId);
		setStep({ kind: "nickname", notice: null });
	}

	// The assignment's theme, from its cover and then from the game (spec 042, RN-15).
	const themeId =
		view?.themeId ??
		(coverState.kind === "ready" ? coverState.cover.themeId : DEFAULT_THEME_ID);
	const themed = (screen: ReactNode) => (
		<GameThemeProvider themeId={themeId}>{screen}</GameThemeProvider>
	);

	if (step.kind === "confirm") {
		return themed(
			<ConfirmParticipant
				nickname={step.nickname}
				busy={resuming}
				notice={step.notice}
				onYes={() => void resume(step.nickname)}
				onNo={startOver}
			/>,
		);
	}

	if (!session) {
		if (coverState.kind !== "ready") {
			return themed(
				<AssignmentLanding
					state={
						coverState.kind === "error"
							? { kind: "error", onRetry: () => void loadCover() }
							: coverState
					}
				/>,
			);
		}
		const { cover } = coverState;
		if (cover.status === "ended") {
			return themed(
				<AssignmentLanding state={{ kind: "ended", name: cover.name }} />,
			);
		}
		return themed(
			step.kind === "nickname" ? (
				<NicknameStep
					cover={cover}
					busy={joining}
					notice={step.notice}
					onSubmit={(nickname) => void join(nickname)}
					onPick={(nickname) =>
						setStep({ kind: "confirm", nickname, notice: null })
					}
				/>
			) : (
				<AssignmentCover
					cover={cover}
					onStart={() => setStep({ kind: "nickname", notice: null })}
				/>
			),
		);
	}

	/** An answer of the question on the screen; one that got no reply gives the controls back. */
	const send = (
		questionIndex: number,
		response: { choiceIds: string[] } | { text: string } | { value: number },
	) =>
		void act(
			() => api.answer({ ...session, questionIndex, ...response }),
			() =>
				setPlay((current) => ({
					...current,
					busy: false,
					failure: ANSWER_NOT_SENT_MESSAGE,
				})),
		);

	if (!view) {
		return themed(
			<AssignmentLanding
				state={
					play.lost
						? { kind: "error", onRetry: () => void load() }
						: { kind: "loading" }
				}
			/>,
		);
	}

	const { screen } = view;
	if (screen.phase === "ready") {
		return themed(
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
			/>,
		);
	}

	const from =
		screen.phase === "results"
			? { questionIndex: screen.result.question.index, phase: screen.phase }
			: screen.phase === "scoreboard"
				? { questionIndex: screen.questionIndex, phase: screen.phase }
				: null;

	return themed(
		<GameScreen className="flex h-svh flex-col">
			{play.lost && (
				<p
					role="status"
					className="shrink-0 bg-game-chip px-3 py-2 text-center font-bold text-game-chip-fg"
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
						onType={(text) => send(screen.question.index, { text })}
						onSlide={(value) => send(screen.question.index, { value })}
						onAnswer={(choiceIds) => send(screen.question.index, { choiceIds })}
					/>
				</div>
			) : (
				<PlayArrows
					screen={{
						phase: screen.phase,
						questionIndex: from?.questionIndex ?? view.questionCount - 1,
					}}
					history={reviewLocked ? [] : view.history}
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
		</GameScreen>,
	);
}
