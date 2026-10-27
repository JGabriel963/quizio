import {
	type AdvanceAssignmentPlay,
	createAdvanceAssignmentPlay,
} from "@quizio/core/game/application/advance-assignment-play";
import {
	type AdvanceGame,
	createAdvanceGame,
} from "@quizio/core/game/application/advance-game";
import {
	type AnswerAssignmentQuestion,
	createAnswerAssignmentQuestion,
} from "@quizio/core/game/application/answer-assignment-question";
import {
	type CloseAnswerReview,
	createCloseAnswerReview,
	createGetTypedAnswers,
	createOpenAnswerReview,
	type GetTypedAnswers,
	type OpenAnswerReview,
} from "@quizio/core/game/application/answer-review";
import {
	type ChangeAssignmentAvatar,
	createChangeAssignmentAvatar,
} from "@quizio/core/game/application/change-assignment-avatar";
import {
	type ChangeAssignmentDeadline,
	createChangeAssignmentDeadline,
} from "@quizio/core/game/application/change-assignment-deadline";
import {
	type ChangeAvatar,
	createChangeAvatar,
} from "@quizio/core/game/application/change-avatar";
import {
	type CreateAssignment,
	createCreateAssignment,
} from "@quizio/core/game/application/create-assignment";
import {
	createEndAssignment,
	type EndAssignment,
} from "@quizio/core/game/application/end-assignment";
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
	createGetAssignmentCover,
	type GetAssignmentCover,
} from "@quizio/core/game/application/get-assignment-cover";
import {
	createGetAssignmentPlay,
	type GetAssignmentPlay,
} from "@quizio/core/game/application/get-assignment-play";
import {
	createGetAssignmentSetup,
	type GetAssignmentSetup,
} from "@quizio/core/game/application/get-assignment-setup";
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
	createJoinAssignment,
	type JoinAssignment,
} from "@quizio/core/game/application/join-assignment";
import {
	createJoinGame,
	type JoinGame,
} from "@quizio/core/game/application/join-game";
import {
	createListOpenAssignments,
	type ListOpenAssignments,
} from "@quizio/core/game/application/list-open-assignments";
import type { AnswerRepository } from "@quizio/core/game/application/ports/answer-repository";
import type { AssignmentLandingQuery } from "@quizio/core/game/application/ports/assignment-landing-query";
import type { AssignmentPinGenerator } from "@quizio/core/game/application/ports/assignment-pin-generator";
import type { AssignmentPreferencesRepository } from "@quizio/core/game/application/ports/assignment-preferences-repository";
import type { GamePinGenerator } from "@quizio/core/game/application/ports/game-pin-generator";
import type { GameQuestionRepository } from "@quizio/core/game/application/ports/game-question-repository";
import type { GameRepository } from "@quizio/core/game/application/ports/game-repository";
import type { HostPreferencesRepository } from "@quizio/core/game/application/ports/host-preferences-repository";
import type { PlayableQuizQuery } from "@quizio/core/game/application/ports/playable-quiz-query";
import type { PlayerRepository } from "@quizio/core/game/application/ports/player-repository";
import type { ReviewResultsWriter } from "@quizio/core/game/application/ports/review-results-writer";
import {
	createRemovePlayer,
	type RemovePlayer,
} from "@quizio/core/game/application/remove-player";
import {
	createResumeAssignment,
	type ResumeAssignment,
} from "@quizio/core/game/application/resume-assignment";
import {
	createReviewTypedAnswers,
	type ReviewTypedAnswers,
} from "@quizio/core/game/application/review-typed-answers";
import {
	createSetGameLocked,
	type SetGameLocked,
} from "@quizio/core/game/application/set-game-locked";
import {
	createSetGameOptions,
	type SetGameOptions,
} from "@quizio/core/game/application/set-game-options";
import {
	createSignalHost,
	type SignalHost,
} from "@quizio/core/game/application/signal-host";
import {
	createStartAssignmentPlay,
	type StartAssignmentPlay,
} from "@quizio/core/game/application/start-assignment-play";
import {
	createStartGame,
	type StartGame,
} from "@quizio/core/game/application/start-game";
import {
	createSubmitAnswer,
	type SubmitAnswer,
} from "@quizio/core/game/application/submit-answer";
import {
	type AcceptGroupInvite,
	createAcceptGroupInvite,
} from "@quizio/core/groups/application/accept-group-invite";
import {
	type AssignInGroup,
	createAssignInGroup,
} from "@quizio/core/groups/application/assign-in-group";
import {
	type AssignToGroups,
	createAssignToGroups,
} from "@quizio/core/groups/application/assign-to-groups";
import {
	type CreateGroup,
	createCreateGroup,
} from "@quizio/core/groups/application/create-group";
import {
	type CreateGroupPost,
	createCreateGroupPost,
} from "@quizio/core/groups/application/create-group-post";
import {
	createDeleteGroup,
	type DeleteGroup,
} from "@quizio/core/groups/application/delete-group";
import {
	createDeleteGroupPost,
	type DeleteGroupPost,
} from "@quizio/core/groups/application/delete-group-post";
import {
	createDiscardGroupUpload,
	type DiscardGroupUpload,
} from "@quizio/core/groups/application/discard-group-upload";
import {
	createDismissGroupSetup,
	type DismissGroupSetup,
} from "@quizio/core/groups/application/dismiss-group-setup";
import {
	createGetGroup,
	type GetGroup,
} from "@quizio/core/groups/application/get-group";
import {
	createGetGroupInvitation,
	type GetGroupInvitation,
} from "@quizio/core/groups/application/get-group-invitation";
import {
	createGetGroupInvite,
	type GetGroupInvite,
} from "@quizio/core/groups/application/get-group-invite";
import {
	createGetGroupSettings,
	type GetGroupSettings,
} from "@quizio/core/groups/application/get-group-settings";
import {
	createGetSharedQuiz,
	type GetSharedQuiz,
} from "@quizio/core/groups/application/get-shared-quiz";
import {
	createLeaveGroup,
	type LeaveGroup,
} from "@quizio/core/groups/application/leave-group";
import {
	createListAssignableGroups,
	type ListAssignableGroups,
} from "@quizio/core/groups/application/list-assignable-groups";
import {
	createListGroupAssignments,
	type ListGroupAssignments,
} from "@quizio/core/groups/application/list-group-assignments";
import {
	createListGroupFeed,
	type ListGroupFeed,
} from "@quizio/core/groups/application/list-group-feed";
import {
	createListGroupMembers,
	type ListGroupMembers,
} from "@quizio/core/groups/application/list-group-members";
import {
	createListGroups,
	type ListGroups,
} from "@quizio/core/groups/application/list-groups";
import {
	createListRecentGroups,
	type ListRecentGroups,
} from "@quizio/core/groups/application/list-recent-groups";
import {
	createListSharedQuizIds,
	type ListSharedQuizIds,
} from "@quizio/core/groups/application/list-shared-quiz-ids";
import {
	createListSharedQuizzes,
	type ListSharedQuizzes,
} from "@quizio/core/groups/application/list-shared-quizzes";
import type { GroupAssignmentQuery } from "@quizio/core/groups/application/ports/group-assignments";
import type { GroupFeedQuery } from "@quizio/core/groups/application/ports/group-feed-query";
import type { GroupMemberRepository } from "@quizio/core/groups/application/ports/group-member-repository";
import type { GroupPostRepository } from "@quizio/core/groups/application/ports/group-post-repository";
import type { GroupReads } from "@quizio/core/groups/application/ports/group-reads";
import type { GroupRepository } from "@quizio/core/groups/application/ports/group-repository";
import type { GroupSharedQuizRepository } from "@quizio/core/groups/application/ports/group-shared-quiz-repository";
import type { GroupUploadRepository } from "@quizio/core/groups/application/ports/group-upload-repository";
import type { GroupVisitRepository } from "@quizio/core/groups/application/ports/group-visit-repository";
import type { InviteCodeGenerator } from "@quizio/core/groups/application/ports/invite-code-generator";
import type { SharedQuizReads } from "@quizio/core/groups/application/ports/shared-quiz-reads";
import {
	createRemoveGroupMember,
	type RemoveGroupMember,
} from "@quizio/core/groups/application/remove-group-member";
import {
	createRequestGroupUpload,
	type RequestGroupUpload,
} from "@quizio/core/groups/application/request-group-upload";
import {
	createResetGroupInvite,
	type ResetGroupInvite,
} from "@quizio/core/groups/application/reset-group-invite";
import {
	createSetGroupPermission,
	type SetGroupPermission,
} from "@quizio/core/groups/application/set-group-permission";
import {
	createSetPostLike,
	type SetPostLike,
} from "@quizio/core/groups/application/set-post-like";
import {
	createShareQuizzesInGroup,
	type ShareQuizzesInGroup,
} from "@quizio/core/groups/application/share-quizzes-in-group";
import {
	createUnshareQuiz,
	type UnshareQuiz,
} from "@quizio/core/groups/application/unshare-quiz";
import {
	createUpdateGroupDetails,
	type UpdateGroupDetails,
} from "@quizio/core/groups/application/update-group-details";
import {
	createVisitGroup,
	type VisitGroup,
} from "@quizio/core/groups/application/visit-group";
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
	createDiscardSource,
	type DiscardSource,
} from "@quizio/core/media/application/discard-source";
import type { SourceUploadRepository } from "@quizio/core/media/application/ports/source-upload-repository";
import {
	createRequestMediaUpload,
	type RequestMediaUpload,
} from "@quizio/core/media/application/request-media-upload";
import {
	createRequestSourceUpload,
	type RequestSourceUpload,
} from "@quizio/core/media/application/request-source-upload";
import {
	type AddGeneratedQuestions,
	createAddGeneratedQuestions,
} from "@quizio/core/quiz/application/add-generated-questions";
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
	createDuplicateSharedQuiz,
	type DuplicateSharedQuiz,
} from "@quizio/core/quiz/application/duplicate-shared-quiz";
import {
	createGenerateQuestions,
	type GenerateQuestions,
} from "@quizio/core/quiz/application/generate-questions";
import {
	type AssistantSettings,
	createGetAssistantStatus,
	type GetAssistantStatus,
} from "@quizio/core/quiz/application/get-assistant-status";
import {
	createGetQuizDetails,
	type GetQuizDetails,
} from "@quizio/core/quiz/application/get-quiz-details";
import {
	createGetQuizEditor,
	type GetQuizEditor,
} from "@quizio/core/quiz/application/get-quiz-editor";
import {
	createGetQuizPreview,
	type GetQuizPreview,
} from "@quizio/core/quiz/application/get-quiz-preview";
import {
	createMoveQuestion,
	type MoveQuestion,
} from "@quizio/core/quiz/application/move-question";
import {
	createMoveQuizToTrash,
	type MoveQuizToTrash,
} from "@quizio/core/quiz/application/move-quiz-to-trash";
import type { AssistantPreferencesRepository } from "@quizio/core/quiz/application/ports/assistant-preferences-repository";
import type { GenerationQuota } from "@quizio/core/quiz/application/ports/generation-quota";
import type { PdfPages } from "@quizio/core/quiz/application/ports/pdf-pages";
import type { QuestionGenerator } from "@quizio/core/quiz/application/ports/question-generator";
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
import {
	createDeleteReportsPermanently,
	type DeleteReportsPermanently,
} from "@quizio/core/reports/application/delete-reports-permanently";
import {
	createGetReport,
	type GetReport,
} from "@quizio/core/reports/application/get-report";
import {
	createGetReportParticipant,
	type GetReportParticipant,
} from "@quizio/core/reports/application/get-report-participant";
import {
	createGetReportQuestion,
	type GetReportQuestion,
} from "@quizio/core/reports/application/get-report-question";
import {
	createListReports,
	type ListReports,
} from "@quizio/core/reports/application/list-reports";
import {
	createMoveReportsToTrash,
	type MoveReportsToTrash,
} from "@quizio/core/reports/application/move-reports-to-trash";
import type { ReportGameQuery } from "@quizio/core/reports/application/ports/report-game-query";
import type { ReportReadGrants } from "@quizio/core/reports/application/ports/report-read-grants";
import type { ReportRepository } from "@quizio/core/reports/application/ports/report-repository";
import {
	createRenameReport,
	type RenameReport,
} from "@quizio/core/reports/application/rename-report";
import {
	createRestoreReports,
	type RestoreReports,
} from "@quizio/core/reports/application/restore-reports";
import type { AttemptLimiter } from "@quizio/core/shared/application/ports/attempt-limiter";
import type { Clock } from "@quizio/core/shared/application/ports/clock";
import type { IdGenerator } from "@quizio/core/shared/application/ports/id-generator";
import type { ObjectStorage } from "@quizio/core/shared/application/ports/object-storage";
import type { QuizShareGrants } from "@quizio/core/shared/application/ports/quiz-share-grants";
import type { RealtimePublisher } from "@quizio/core/shared/application/ports/realtime-publisher";
import type { Shuffler } from "@quizio/core/shared/application/ports/shuffler";

/** Instance settings of the assignments (spec 029, RN-08). */
export interface AssignmentSettings {
	/** How far ahead a deadline may be. */
	maxDeadlineDays: number;
}

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
	/** The review's stage write and regrades, together (spec 031). */
	reviewResults: ReviewResultsWriter;
	playableQuizzes: PlayableQuizQuery;
	preferences: HostPreferencesRepository;
	/** The live games as the reports read them (spec 015). */
	reportGames: ReportGameQuery;
	reports: ReportRepository;
	pins: GamePinGenerator;
	/** Eight-digit PINs of the assignments (spec 029). */
	assignmentPins: AssignmentPinGenerator;
	assignmentPreferences: AssignmentPreferencesRepository;
	assignmentLanding: AssignmentLandingQuery;
	assignmentSettings: AssignmentSettings;
	shuffler: Shuffler;
	attempts: AttemptLimiter;
	authSettings: AuthSettings;
	/** Null when the instance has no AI provider: the assistant is off (spec 027, RN-01). */
	questionGenerator: QuestionGenerator | null;
	pdfPages: PdfPages;
	generationQuota: GenerationQuota;
	assistantPreferences: AssistantPreferencesRepository;
	sourceUploads: SourceUploadRepository;
	assistantSettings: AssistantSettings;
	/** Groups and their members (spec 034). */
	groups: GroupRepository;
	groupMembers: GroupMemberRepository;
	groupVisits: GroupVisitRepository;
	/** The groups with the accounts' names and emails. */
	groupReads: GroupReads;
	inviteCodes: InviteCodeGenerator;
	/** The group's feed and the assignments it shows (spec 038). */
	groupPosts: GroupPostRepository;
	groupFeed: GroupFeedQuery;
	groupAssignmentQuery: GroupAssignmentQuery;
	/** The groups' files nobody posted yet (spec 036; ADR 0017). */
	groupUploads: GroupUploadRepository;
	/** Who else may read a report: a group's admin (spec 038, RN-20a). */
	reportReadGrants: ReportReadGrants;
	/** Quizzes shared with groups (spec 037; ADR 0018). */
	groupSharedQuizzes: GroupSharedQuizRepository;
	sharedQuizReads: SharedQuizReads;
	/** Who may use a quiz they do not own: a member of a group it is in. */
	quizShareGrants: QuizShareGrants;
}

export interface Container extends Adapters {
	useCases: {
		requestMediaUpload: RequestMediaUpload;
		requestSourceUpload: RequestSourceUpload;
		discardSource: DiscardSource;
		getAssistantStatus: GetAssistantStatus;
		generateQuestions: GenerateQuestions;
		addGeneratedQuestions: AddGeneratedQuestions;
		createQuiz: CreateQuiz;
		getQuizDetails: GetQuizDetails;
		getQuizPreview: GetQuizPreview;
		updateQuizDetails: UpdateQuizDetails;
		duplicateQuiz: DuplicateQuiz;
		duplicateSharedQuiz: DuplicateSharedQuiz;
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
		signalHost: SignalHost;
		setGameLocked: SetGameLocked;
		setGameOptions: SetGameOptions;
		removePlayer: RemovePlayer;
		endGame: EndGame;
		findGameByPin: FindGameByPin;
		joinGame: JoinGame;
		changeAvatar: ChangeAvatar;
		getPlayerSession: GetPlayerSession;
		submitAnswer: SubmitAnswer;
		openAnswerReview: OpenAnswerReview;
		closeAnswerReview: CloseAnswerReview;
		getTypedAnswers: GetTypedAnswers;
		reviewTypedAnswers: ReviewTypedAnswers;
		getAssignmentSetup: GetAssignmentSetup;
		createAssignment: CreateAssignment;
		changeAssignmentDeadline: ChangeAssignmentDeadline;
		endAssignment: EndAssignment;
		getAssignmentCover: GetAssignmentCover;
		listOpenAssignments: ListOpenAssignments;
		joinAssignment: JoinAssignment;
		resumeAssignment: ResumeAssignment;
		getAssignmentPlay: GetAssignmentPlay;
		startAssignmentPlay: StartAssignmentPlay;
		answerAssignmentQuestion: AnswerAssignmentQuestion;
		advanceAssignmentPlay: AdvanceAssignmentPlay;
		changeAssignmentAvatar: ChangeAssignmentAvatar;
		deleteReportsPermanently: DeleteReportsPermanently;
		getReport: GetReport;
		getReportParticipant: GetReportParticipant;
		getReportQuestion: GetReportQuestion;
		listReports: ListReports;
		moveReportsToTrash: MoveReportsToTrash;
		renameReport: RenameReport;
		restoreReports: RestoreReports;
		acceptGroupInvite: AcceptGroupInvite;
		createGroup: CreateGroup;
		deleteGroup: DeleteGroup;
		dismissGroupSetup: DismissGroupSetup;
		getGroup: GetGroup;
		getGroupInvitation: GetGroupInvitation;
		getGroupInvite: GetGroupInvite;
		leaveGroup: LeaveGroup;
		listGroupMembers: ListGroupMembers;
		listGroups: ListGroups;
		listRecentGroups: ListRecentGroups;
		removeGroupMember: RemoveGroupMember;
		resetGroupInvite: ResetGroupInvite;
		visitGroup: VisitGroup;
		assignInGroup: AssignInGroup;
		assignToGroups: AssignToGroups;
		deleteGroupPost: DeleteGroupPost;
		listAssignableGroups: ListAssignableGroups;
		listGroupAssignments: ListGroupAssignments;
		listGroupFeed: ListGroupFeed;
		setPostLike: SetPostLike;
		createGroupPost: CreateGroupPost;
		shareQuizzesInGroup: ShareQuizzesInGroup;
		unshareQuiz: UnshareQuiz;
		listSharedQuizzes: ListSharedQuizzes;
		listSharedQuizIds: ListSharedQuizIds;
		getSharedQuiz: GetSharedQuiz;
		requestGroupUpload: RequestGroupUpload;
		discardGroupUpload: DiscardGroupUpload;
		getGroupSettings: GetGroupSettings;
		setGroupPermission: SetGroupPermission;
		updateGroupDetails: UpdateGroupDetails;
	};
}

/**
 * Wires use cases to adapters. Pure function with no env access, so tests
 * build a container from in-memory fakes and exercise real routers.
 */
export function createContainer(adapters: Adapters): Container {
	// The quiz context reaches the live games through its own port (spec 008, RN-34).
	const endGamesOfQuiz = createEndGamesOfQuiz(adapters);
	const assignmentDeps = {
		...adapters,
		maxDeadlineDays: adapters.assignmentSettings.maxDeadlineDays,
	};
	const createAssignment = createCreateAssignment(assignmentDeps);
	// The groups reach "Criar uma tarefa" through their own port (spec 038).
	const groupDeps = {
		...adapters,
		groupAssignments: {
			create: async (input: Parameters<typeof createAssignment>[0]) => {
				const { gameId } = await createAssignment(input);
				return { gameId };
			},
		},
	};
	const quizGames = {
		// The open ones end, assignments too (spec 029, RN-42); the ones that
		// never started go with the quiz, and the ones that started stay, as
		// reports (spec 015, RN-05).
		endGamesOfDeletedQuiz: async (quizId: string) => {
			await endGamesOfQuiz({ quizId, reason: "quizDeleted" });
			await adapters.games.deleteUnstartedByQuiz(quizId);
		},
	};

	return {
		...adapters,
		useCases: {
			requestMediaUpload: createRequestMediaUpload(adapters),
			requestSourceUpload: createRequestSourceUpload(adapters),
			discardSource: createDiscardSource(adapters),
			getAssistantStatus: createGetAssistantStatus(adapters),
			generateQuestions: createGenerateQuestions(adapters),
			addGeneratedQuestions: createAddGeneratedQuestions(adapters),
			createQuiz: createCreateQuiz(adapters),
			getQuizDetails: createGetQuizDetails(adapters),
			getQuizPreview: createGetQuizPreview(adapters),
			updateQuizDetails: createUpdateQuizDetails(adapters),
			duplicateQuiz: createDuplicateQuiz(adapters),
			duplicateSharedQuiz: createDuplicateSharedQuiz({
				...adapters,
				quizVersions: adapters.versions,
			}),
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
			signalHost: createSignalHost(adapters),
			setGameLocked: createSetGameLocked(adapters),
			setGameOptions: createSetGameOptions(adapters),
			removePlayer: createRemovePlayer(adapters),
			endGame: createEndGame(adapters),
			findGameByPin: createFindGameByPin(adapters),
			joinGame: createJoinGame(adapters),
			changeAvatar: createChangeAvatar(adapters),
			getPlayerSession: createGetPlayerSession(adapters),
			submitAnswer: createSubmitAnswer(adapters),
			openAnswerReview: createOpenAnswerReview(adapters),
			closeAnswerReview: createCloseAnswerReview(adapters),
			getTypedAnswers: createGetTypedAnswers(adapters),
			reviewTypedAnswers: createReviewTypedAnswers(adapters),
			getAssignmentSetup: createGetAssignmentSetup(assignmentDeps),
			createAssignment,
			changeAssignmentDeadline: createChangeAssignmentDeadline(assignmentDeps),
			endAssignment: createEndAssignment(adapters),
			getAssignmentCover: createGetAssignmentCover(adapters),
			listOpenAssignments: createListOpenAssignments(adapters),
			joinAssignment: createJoinAssignment(adapters),
			resumeAssignment: createResumeAssignment(adapters),
			getAssignmentPlay: createGetAssignmentPlay(adapters),
			startAssignmentPlay: createStartAssignmentPlay(adapters),
			answerAssignmentQuestion: createAnswerAssignmentQuestion(adapters),
			advanceAssignmentPlay: createAdvanceAssignmentPlay(adapters),
			changeAssignmentAvatar: createChangeAssignmentAvatar(adapters),
			deleteReportsPermanently: createDeleteReportsPermanently(adapters),
			getReport: createGetReport(adapters),
			getReportParticipant: createGetReportParticipant(adapters),
			getReportQuestion: createGetReportQuestion(adapters),
			listReports: createListReports(adapters),
			moveReportsToTrash: createMoveReportsToTrash(adapters),
			renameReport: createRenameReport(adapters),
			restoreReports: createRestoreReports(adapters),
			acceptGroupInvite: createAcceptGroupInvite(adapters),
			createGroup: createCreateGroup(adapters),
			deleteGroup: createDeleteGroup(adapters),
			dismissGroupSetup: createDismissGroupSetup(adapters),
			getGroup: createGetGroup(adapters),
			getGroupInvitation: createGetGroupInvitation(adapters),
			getGroupInvite: createGetGroupInvite(adapters),
			leaveGroup: createLeaveGroup(adapters),
			listGroupMembers: createListGroupMembers(adapters),
			listGroups: createListGroups(adapters),
			listRecentGroups: createListRecentGroups(adapters),
			removeGroupMember: createRemoveGroupMember(adapters),
			resetGroupInvite: createResetGroupInvite(adapters),
			visitGroup: createVisitGroup(adapters),
			assignInGroup: createAssignInGroup(groupDeps),
			assignToGroups: createAssignToGroups(groupDeps),
			deleteGroupPost: createDeleteGroupPost(groupDeps),
			listAssignableGroups: createListAssignableGroups(groupDeps),
			listGroupAssignments: createListGroupAssignments(groupDeps),
			listGroupFeed: createListGroupFeed(groupDeps),
			setPostLike: createSetPostLike(groupDeps),
			createGroupPost: createCreateGroupPost(adapters),
			shareQuizzesInGroup: createShareQuizzesInGroup(adapters),
			unshareQuiz: createUnshareQuiz(adapters),
			listSharedQuizzes: createListSharedQuizzes(adapters),
			listSharedQuizIds: createListSharedQuizIds(adapters),
			getSharedQuiz: createGetSharedQuiz(adapters),
			requestGroupUpload: createRequestGroupUpload(adapters),
			discardGroupUpload: createDiscardGroupUpload(adapters),
			getGroupSettings: createGetGroupSettings(adapters),
			setGroupPermission: createSetGroupPermission(adapters),
			updateGroupDetails: createUpdateGroupDetails(adapters),
		},
	};
}
