import {
	type AdvanceGame,
	createAdvanceGame,
} from "@quizio/core/game/application/advance-game";
import {
	createEndGame,
	type EndGame,
} from "@quizio/core/game/application/end-game";
import { createEndGamesOfQuiz } from "@quizio/core/game/application/end-games-of-quiz";
import {
	createFindGameByPin,
	type FindGameByPin,
} from "@quizio/core/game/application/find-game-by-pin";
import {
	createGetHostGame,
	type GetHostGame,
} from "@quizio/core/game/application/get-host-game";
import {
	createGetPlayerSession,
	type GetPlayerSession,
} from "@quizio/core/game/application/get-player-session";
import {
	createHostGame,
	type HostGame,
} from "@quizio/core/game/application/host-game";
import {
	createJoinGame,
	type JoinGame,
} from "@quizio/core/game/application/join-game";
import type { AnswerRepository } from "@quizio/core/game/application/ports/answer-repository";
import type { GamePinGenerator } from "@quizio/core/game/application/ports/game-pin-generator";
import type { GameQuestionRepository } from "@quizio/core/game/application/ports/game-question-repository";
import type { GameRepository } from "@quizio/core/game/application/ports/game-repository";
import type { HostPreferencesRepository } from "@quizio/core/game/application/ports/host-preferences-repository";
import type { PlayableQuizQuery } from "@quizio/core/game/application/ports/playable-quiz-query";
import type { PlayerRepository } from "@quizio/core/game/application/ports/player-repository";
import {
	createRemovePlayer,
	type RemovePlayer,
} from "@quizio/core/game/application/remove-player";
import {
	createSetGameLocked,
	type SetGameLocked,
} from "@quizio/core/game/application/set-game-locked";
import {
	createSetGameOptions,
	type SetGameOptions,
} from "@quizio/core/game/application/set-game-options";
import {
	createStartGame,
	type StartGame,
} from "@quizio/core/game/application/start-game";
import {
	createSubmitAnswer,
	type SubmitAnswer,
} from "@quizio/core/game/application/submit-answer";
import {
	createGetHomeOverview,
	type GetHomeOverview,
} from "@quizio/core/library/application/get-home-overview";
import {
	createListLibrary,
	type ListLibrary,
} from "@quizio/core/library/application/list-library";
import type { LibraryQuizQuery } from "@quizio/core/library/application/ports/library-quiz-query";
import {
	createRequestMediaUpload,
	type RequestMediaUpload,
} from "@quizio/core/media/application/request-media-upload";
import {
	type AddQuestion,
	createAddQuestion,
} from "@quizio/core/quiz/application/add-question";
import {
	type ApplyTimeLimitToAll,
	createApplyTimeLimitToAll,
} from "@quizio/core/quiz/application/apply-time-limit-to-all";
import {
	type CreateQuiz,
	createCreateQuiz,
} from "@quizio/core/quiz/application/create-quiz";
import {
	createDeleteQuestion,
	type DeleteQuestion,
} from "@quizio/core/quiz/application/delete-question";
import {
	createDeleteQuizPermanently,
	type DeleteQuizPermanently,
} from "@quizio/core/quiz/application/delete-quiz-permanently";
import {
	createDiscardQuizChanges,
	type DiscardQuizChanges,
} from "@quizio/core/quiz/application/discard-quiz-changes";
import {
	createDuplicateQuestion,
	type DuplicateQuestion,
} from "@quizio/core/quiz/application/duplicate-question";
import {
	createDuplicateQuiz,
	type DuplicateQuiz,
} from "@quizio/core/quiz/application/duplicate-quiz";
import {
	createGetQuizDetails,
	type GetQuizDetails,
} from "@quizio/core/quiz/application/get-quiz-details";
import {
	createGetQuizEditor,
	type GetQuizEditor,
} from "@quizio/core/quiz/application/get-quiz-editor";
import {
	createMoveQuestion,
	type MoveQuestion,
} from "@quizio/core/quiz/application/move-question";
import {
	createMoveQuizToTrash,
	type MoveQuizToTrash,
} from "@quizio/core/quiz/application/move-quiz-to-trash";
import type { QuestionRepository } from "@quizio/core/quiz/application/ports/question-repository";
import type { QuizRepository } from "@quizio/core/quiz/application/ports/quiz-repository";
import type { QuizVersionRepository } from "@quizio/core/quiz/application/ports/quiz-version-repository";
import {
	createPublishQuiz,
	type PublishQuiz,
} from "@quizio/core/quiz/application/publish-quiz";
import {
	createRenameQuiz,
	type RenameQuiz,
} from "@quizio/core/quiz/application/rename-quiz";
import {
	createRestoreQuiz,
	type RestoreQuiz,
} from "@quizio/core/quiz/application/restore-quiz";
import {
	createUpdateQuestion,
	type UpdateQuestion,
} from "@quizio/core/quiz/application/update-question";
import {
	createUpdateQuizDetails,
	type UpdateQuizDetails,
} from "@quizio/core/quiz/application/update-quiz-details";
import type { AttemptLimiter } from "@quizio/core/shared/application/ports/attempt-limiter";
import type { Clock } from "@quizio/core/shared/application/ports/clock";
import type { IdGenerator } from "@quizio/core/shared/application/ports/id-generator";
import type { ObjectStorage } from "@quizio/core/shared/application/ports/object-storage";
import type { RealtimePublisher } from "@quizio/core/shared/application/ports/realtime-publisher";
import type { Shuffler } from "@quizio/core/shared/application/ports/shuffler";

/** Public sign-in options the login screen needs to know about. */
export interface AuthSettings {
	signUpEnabled: boolean;
	googleEnabled: boolean;
}

/** Driven adapters and settings the application needs. Production wiring lives in composition-root.ts. */
export interface Adapters {
	storage: ObjectStorage;
	realtime: RealtimePublisher;
	ids: IdGenerator;
	clock: Clock;
	quizzes: QuizRepository;
	questions: QuestionRepository;
	versions: QuizVersionRepository;
	libraryQuizzes: LibraryQuizQuery;
	games: GameRepository;
	players: PlayerRepository;
	gameQuestions: GameQuestionRepository;
	answers: AnswerRepository;
	playableQuizzes: PlayableQuizQuery;
	preferences: HostPreferencesRepository;
	pins: GamePinGenerator;
	shuffler: Shuffler;
	attempts: AttemptLimiter;
	authSettings: AuthSettings;
}

export interface Container extends Adapters {
	useCases: {
		requestMediaUpload: RequestMediaUpload;
		createQuiz: CreateQuiz;
		getQuizDetails: GetQuizDetails;
		updateQuizDetails: UpdateQuizDetails;
		duplicateQuiz: DuplicateQuiz;
		moveQuizToTrash: MoveQuizToTrash;
		restoreQuiz: RestoreQuiz;
		deleteQuizPermanently: DeleteQuizPermanently;
		getQuizEditor: GetQuizEditor;
		renameQuiz: RenameQuiz;
		publishQuiz: PublishQuiz;
		discardQuizChanges: DiscardQuizChanges;
		addQuestion: AddQuestion;
		duplicateQuestion: DuplicateQuestion;
		moveQuestion: MoveQuestion;
		deleteQuestion: DeleteQuestion;
		updateQuestion: UpdateQuestion;
		applyTimeLimitToAll: ApplyTimeLimitToAll;
		listLibrary: ListLibrary;
		getHomeOverview: GetHomeOverview;
		hostGame: HostGame;
		getHostGame: GetHostGame;
		startGame: StartGame;
		advanceGame: AdvanceGame;
		setGameLocked: SetGameLocked;
		setGameOptions: SetGameOptions;
		removePlayer: RemovePlayer;
		endGame: EndGame;
		findGameByPin: FindGameByPin;
		joinGame: JoinGame;
		getPlayerSession: GetPlayerSession;
		submitAnswer: SubmitAnswer;
	};
}

/**
 * Wires use cases to adapters. Pure function with no env access, so tests
 * build a container from in-memory fakes and exercise real routers.
 */
export function createContainer(adapters: Adapters): Container {
	// The quiz context reaches the live games through its own port (spec 008, RN-34).
	const endGamesOfQuiz = createEndGamesOfQuiz(adapters);
	const quizGames = {
		endGamesOfDeletedQuiz: (quizId: string) =>
			endGamesOfQuiz({ quizId, reason: "quizDeleted" }),
	};

	return {
		...adapters,
		useCases: {
			requestMediaUpload: createRequestMediaUpload(adapters),
			createQuiz: createCreateQuiz(adapters),
			getQuizDetails: createGetQuizDetails(adapters),
			updateQuizDetails: createUpdateQuizDetails(adapters),
			duplicateQuiz: createDuplicateQuiz(adapters),
			moveQuizToTrash: createMoveQuizToTrash(adapters),
			restoreQuiz: createRestoreQuiz(adapters),
			deleteQuizPermanently: createDeleteQuizPermanently({
				...adapters,
				quizGames,
			}),
			getQuizEditor: createGetQuizEditor(adapters),
			renameQuiz: createRenameQuiz(adapters),
			publishQuiz: createPublishQuiz(adapters),
			discardQuizChanges: createDiscardQuizChanges(adapters),
			addQuestion: createAddQuestion(adapters),
			duplicateQuestion: createDuplicateQuestion(adapters),
			moveQuestion: createMoveQuestion(adapters),
			deleteQuestion: createDeleteQuestion(adapters),
			updateQuestion: createUpdateQuestion(adapters),
			applyTimeLimitToAll: createApplyTimeLimitToAll(adapters),
			listLibrary: createListLibrary(adapters),
			getHomeOverview: createGetHomeOverview(adapters),
			hostGame: createHostGame(adapters),
			getHostGame: createGetHostGame(adapters),
			startGame: createStartGame(adapters),
			advanceGame: createAdvanceGame(adapters),
			setGameLocked: createSetGameLocked(adapters),
			setGameOptions: createSetGameOptions(adapters),
			removePlayer: createRemovePlayer(adapters),
			endGame: createEndGame(adapters),
			findGameByPin: createFindGameByPin(adapters),
			joinGame: createJoinGame(adapters),
			getPlayerSession: createGetPlayerSession(adapters),
			submitAnswer: createSubmitAnswer(adapters),
		},
	};
}
